import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'

const ROLE_TAG = /@riviere-role\s+(\S+)/g

function parseAllRoleNames(text) {
  return [...text.matchAll(ROLE_TAG)].map((match) => match[1])
}

function parseSingleRoleName(text, errorContext) {
  const roleNames = parseAllRoleNames(text)
  if (roleNames.length === 0) {
    return null
  }
  if (roleNames.length > 1) {
    throw new Error(
      `Expected exactly 1 @riviere-role annotation ${errorContext}. Got ${roleNames.length}: [${roleNames.join(', ')}]`,
    )
  }
  return roleNames[0]
}

function referenceForUnknownRole(options) {
  return `Browse ${options.roleDefinitionsDir}/ — each <role-name>.md file has a Purpose, Canonical Example, Common Misclassifications, and Anti-Patterns section. Read the canonical example + anti-patterns of EVERY candidate role before picking one. See ${options.configDisplayPath}.`
}

function referenceForKnownRole(options, roleName) {
  return `Re-read ${options.roleDefinitionsDir}/${roleName}.md — check Purpose, Canonical Example, Anti-Patterns, and (if present) the Critical Naming Rule. See ${options.configDisplayPath}.`
}

export default {
  meta: { name: 'riviere-role-enforcement' },
  rules: {
    'enforce-roles': {
      meta: { schema: [{ type: 'object' }] },
      create(context) {
        const [options] = context.options
        const roleMap = new Map(options.roles.map((role) => [role.name, role]))
        const locationHierarchy = options.locationHierarchy ?? []
        const sourceCode = context.sourceCode
        const fileCache = new Map()
        const importCache = new Map()
        const relativeFilePath = normalizePath(
          readRelativeFilePath(context.filename, options.configDir),
        )
        const filename = path.resolve(options.configDir, relativeFilePath)

        if (!/\.tsx?$/.test(filename)) {
          return {}
        }

        const isTestFile = /\.(spec|test)\.tsx?$/.test(filename)
        const fileRoles = []
        const roleDeclarations = []

        const sourceLocationChain = resolveLocationChain(relativeFilePath, locationHierarchy)

        return {
          Program(node) {
            validateConfiguredSubLocations(node, sourceLocationChain, relativeFilePath)
          },
          FunctionDeclaration(node) {
            validateDeclaration(node, 'function')
          },
          ClassDeclaration(node) {
            validateDeclaration(node, 'class')
          },
          TSInterfaceDeclaration(node) {
            validateDeclaration(node, 'interface')
          },
          TSTypeAliasDeclaration(node) {
            validateDeclaration(node, 'type-alias')
          },
          ImportDeclaration(node) {
            if (isTestFile) {
              return
            }
            validateHierarchyImport(node, sourceLocationChain)
          },
          'Program:exit'() {
            if (isTestFile) {
              return
            }
            validateForbiddenDependencies()
            validateForbiddenMethodCalls()
          },
        }

        function validateConfiguredSubLocations(node, locationChain, filePath) {
          if (locationHierarchy.length === 0 || locationChain.length === 0) {
            return
          }
          const deepest = locationChain.at(-1)
          if (deepest.location.allowAnySubLocations) {
            return
          }
          const fileDirectory = normalizePath(path.dirname(filePath))
          const remainder = relativeSegments(fileDirectory, deepest.concretePath)
          if (remainder.length > 0) {
            report(
              node,
              `Unconfigured sub-location '${remainder[0]}' inside location '${deepest.location.name}'.`,
            )
          }
        }

        function validateHierarchyImport(node, sourceChain) {
          if (locationHierarchy.length === 0 || sourceChain.length === 0) {
            return
          }
          const importSource = node.source.value
          if (typeof importSource !== 'string') {
            return
          }

          const resolvedImport = resolveImportFile(
            filename,
            importSource,
            options.configDir,
            options.importAliases,
          )
          if (resolvedImport === null || !isInsideDirectory(resolvedImport, options.configDir)) {
            return
          }

          for (const targetFile of resolveImportedFiles(node, resolvedImport)) {
            const targetRelative = normalizePath(readRelativeFilePath(targetFile, options.configDir))
            const targetChain = resolveLocationChain(targetRelative, locationHierarchy)
            if (targetChain.length === 0) {
              continue
            }

            if (
              validateSourceLocationRules(node, sourceChain, targetChain, targetRelative, targetFile)
            ) {
              return
            }
            validateTargetLocationRules(node, targetChain)
          }
        }

        function resolveImportedFiles(node, resolvedImport) {
          const files = []
          for (const specifier of node.specifiers ?? []) {
            if (specifier.type !== 'ImportSpecifier') {
              continue
            }
            const importedName =
              specifier.imported.type === 'Identifier'
                ? specifier.imported.name
                : specifier.imported.value
            const exportedFile = resolveExportedFile(resolvedImport, importedName)
            if (exportedFile !== null) {
              files.push(exportedFile)
            }
          }
          return files.length > 0 ? [...new Set(files)] : [resolvedImport]
        }

        function validateSourceLocationRules(node, sourceChain, targetChain, targetRelative, resolvedImport) {
          for (const source of sourceChain) {
            if (rejectsSiblingImport(node, source, targetChain)) {
              return true
            }
            if (rejectsLocationImport(node, source, targetChain, targetRelative, resolvedImport)) {
              return true
            }
          }
          return false
        }

        function rejectsSiblingImport(node, source, targetChain) {
          if (source.location.dependencyRules?.canImportSiblings !== false) {
            return false
          }
          const targetPeer = targetChain.find(
            (target) => target.location.pathTemplate === source.location.pathTemplate,
          )
          if (targetPeer === undefined || targetPeer.concretePath === source.concretePath) {
            return false
          }
          report(node, `Location '${source.concretePath}' cannot import sibling location instance '${targetPeer.concretePath}'.`)
          return true
        }

        function rejectsLocationImport(node, source, targetChain, targetRelative, resolvedImport) {
          const permittedLocations = source.location.dependencyRules?.locations
          if (!Array.isArray(permittedLocations) || isWithinPath(targetRelative, source.concretePath)) {
            return false
          }
          const permitted = permittedLocations.some((rule) =>
            locationRuleAllows(rule, source, targetChain, node, resolvedImport),
          )
          if (permitted) {
            return false
          }
          const targetName = targetChain.at(-1).location.name
          report(node, `Location '${source.location.name}' cannot import location '${targetName}'.`)
          return true
        }

        function validateTargetLocationRules(node, targetChain) {
          for (const target of targetChain) {
            if (target.location.dependencyRules?.importableFrom !== 'withinParentLocation') {
              continue
            }
            const parentLocation = locationById(locationHierarchy, target.location.parentId)
            const targetParent = targetChain.find(
              (candidate) => candidate.location.pathTemplate === parentLocation?.pathTemplate,
            )
            if (targetParent !== undefined && !isWithinPath(relativeFilePath, targetParent.concretePath)) {
              report(node, `Location '${target.location.name}' can only be imported from within its parent location.`)
              return
            }
          }
        }

        function locationRuleAllows(rule, source, targetChain, node, resolvedImport) {
          const candidates = targetChain.filter((target) =>
            locationNameMatches(rule.location, target.location.name),
          )
          for (const target of candidates) {
            if (!sameConcreteParentWhenSharedTemplate(source, target, locationHierarchy)) {
              continue
            }
            if (!Array.isArray(rule.roles)) {
              return true
            }
            const importedRoles = readImportedRoles(node, resolvedImport)
            if (importedRoles.length > 0 && importedRoles.every((role) => rule.roles.includes(role))) {
              return true
            }
          }
          return false
        }

        function readImportedRoles(node, resolvedImport) {
          const roles = []
          for (const specifier of node.specifiers ?? []) {
            if (specifier.type === 'ImportSpecifier') {
              const importedName =
                specifier.imported.type === 'Identifier'
                  ? specifier.imported.name
                  : specifier.imported.value
              const importedRole = readExportedRole(resolvedImport, importedName)
              if (importedRole !== null) {
                roles.push(importedRole)
              }
            } else if (specifier.type === 'ImportNamespaceSpecifier') {
              roles.push(...readAllExportedRoles(resolvedImport))
            }
          }
          return [...new Set(roles)]
        }

        function validateDeclaration(node, target) {
          if (isTestFile) {
            return
          }
          if (!isTopLevelExported(node)) {
            return
          }

          const name = readDeclarationName(node)
          if (name === null) {
            return
          }

          const annotationNode = readAnnotationNode(node)
          const roleNames = readRoleNames(sourceCode, annotationNode)
          if (roleNames.length === 0) {
            report(
              node,
              `Missing @riviere-role annotation for '${name}'. ${referenceForUnknownRole(options)}`,
            )
            return
          }

          if (roleNames.length > 1) {
            report(
              node,
              `Multiple @riviere-role annotations found for '${name}'. ${referenceForUnknownRole(options)}`,
            )
            return
          }

          const [roleName] = roleNames
          const role = roleMap.get(roleName)
          if (role === undefined) {
            report(
              node,
              `Unknown role '${roleName}' on '${name}'. ${referenceForUnknownRole(options)}`,
            )
            return
          }

          if (!role.targets.includes(target)) {
            report(
              node,
              `Role '${roleName}' does not allow target '${target}'. ${referenceForKnownRole(options, roleName)}`,
            )
            return
          }

          if (!isRoleAllowedInFile(roleName, relativeFilePath)) {
            report(
              node,
              `${roleName} cannot live in ${relativeFilePath}. ${referenceForKnownRole(options, roleName)}`,
            )
            return
          }

          if (!matchesName(name, role)) {
            report(
              node,
              `Role '${roleName}' does not allow name '${name}'. ${referenceForKnownRole(options, roleName)}`,
            )
            return
          }

          validateForbiddenSupertypes(node, role, name)

          const approvedResult = matchesApprovedInstances(name, role)
          if (approvedResult.checked && !approvedResult.passed) {
            report(node, approvedResult.reason)
            return
          }

          fileRoles.push(roleName)
          roleDeclarations.push({
            node,
            roleName,
          })

          if (target === 'function') {
            validateFunctionContract(node, role, name)
          }

          if (target === 'class') {
            validateClassContract(node, role, name)
          }
        }

        function validateForbiddenSupertypes(node, role, name) {
          if (!Array.isArray(role.forbiddenSupertypes) || role.forbiddenSupertypes.length === 0) {
            return
          }

          const declarationSupertypes = readDeclaredSupertypes(node)
          for (const supertype of declarationSupertypes) {
            if (role.forbiddenSupertypes.includes(supertype)) {
              report(
                node,
                `Role '${role.name}' forbids supertype '${supertype}' on '${name}'. ${referenceForKnownRole(options, role.name)}`,
              )
            }
          }
        }

        function readDeclaredSupertypes(node) {
          const supertypes = []

          if (node.type === 'ClassDeclaration') {
            const superClassName = readNamedTypeReference(node.superClass)
            if (superClassName !== null) {
              supertypes.push(superClassName)
            }

            for (const implementedType of node.implements ?? []) {
              const implementedName = readNamedTypeReference(implementedType.expression)
              if (implementedName !== null) {
                supertypes.push(implementedName)
              }
            }
          }

          if (node.type === 'TSInterfaceDeclaration') {
            for (const extendedType of node.extends ?? []) {
              const extendedName = readNamedTypeReference(extendedType.expression)
              if (extendedName !== null) {
                supertypes.push(extendedName)
              }
            }
          }

          return supertypes
        }

        function readNamedTypeReference(node) {
          if (node?.type === 'Identifier') {
            return node.name
          }

          return null
        }

        function isRoleAllowedInFile(roleName, filePath) {
          return resolveLocationChain(filePath, locationHierarchy).some((location) =>
            location.location.allowedRoles.includes(roleName),
          )
        }

        function validateForbiddenDependencies() {
          if (fileRoles.length === 0) {
            return
          }

          for (const statement of readRelativeImportStatements()) {
            reportForbiddenImports(statement)
          }
        }

        function validateForbiddenMethodCalls() {
          const forbiddenMethodCallRoles = collectForbiddenMethodCallRoles(fileRoles, roleMap)
          if (forbiddenMethodCallRoles.size === 0) {
            return
          }

          const restrictedBindings = new Map()
          for (const statement of readRelativeImportStatements()) {
            const resolvedFile = resolveTypeFile(filename, statement.source.value)
            if (resolvedFile === null) {
              continue
            }
            const importedRoles = readAllExportedRoles(resolvedFile)
            const matchedRole = importedRoles.find((r) => forbiddenMethodCallRoles.has(r))
            if (matchedRole === undefined) {
              continue
            }
            for (const specifier of statement.specifiers ?? []) {
              if (specifier.type === 'ImportSpecifier' || specifier.type === 'ImportDefaultSpecifier') {
                restrictedBindings.set(specifier.local.name, matchedRole)
              }
            }
          }

          if (restrictedBindings.size === 0) {
            return
          }

          const nonImportBody = sourceCode.ast.body.filter(
            (n) => n.type !== 'ImportDeclaration',
          )
          for (const node of nonImportBody) {
            walkForNonConstructionUsages(node, restrictedBindings, false)
          }
        }

        function walkForNonConstructionUsages(node, restrictedBindings, insideNew) {
          if (node === null || node === undefined || typeof node !== 'object') {
            return
          }

          if (node.type === 'NewExpression') {
            walkForNonConstructionUsages(node.callee, restrictedBindings, true)
            walkChildren(node.arguments ?? [], restrictedBindings)
            return
          }

          if (isRestrictedNonConstructionUsage(node, restrictedBindings, insideNew)) {
            return
          }

          walkNodeChildren(node, restrictedBindings)
        }

        function isRestrictedNonConstructionUsage(node, restrictedBindings, insideNew) {
          if (node.type !== 'Identifier' || insideNew || !restrictedBindings.has(node.name)) {
            return false
          }
          const roleName = restrictedBindings.get(node.name)
          report(
            node,
            `Role '${fileRoles.join(', ')}' forbids non-construction usage of '${roleName}' imports. Only 'new' is allowed. ${referenceForKnownRole(options, roleName)}`,
          )
          return true
        }

        function walkNodeChildren(node, restrictedBindings) {
          for (const key of Object.keys(node)) {
            if (key === 'parent') {
              continue
            }
            const child = node[key]
            if (Array.isArray(child)) {
              walkChildren(child, restrictedBindings)
            } else if (child !== null && typeof child === 'object' && child.type !== undefined) {
              walkForNonConstructionUsages(child, restrictedBindings, false)
            }
          }
        }

        function walkChildren(children, restrictedBindings) {
          for (const item of children) {
            walkForNonConstructionUsages(item, restrictedBindings, false)
          }
        }

        function readRelativeImportStatements() {
          return sourceCode.ast.body.filter(
            (statement) =>
              statement.type === 'ImportDeclaration' &&
              typeof statement.source.value === 'string' &&
              statement.source.value.startsWith('.'),
          )
        }

        function reportForbiddenImports(statement) {
          const resolvedFile = resolveTypeFile(filename, statement.source.value)
          if (resolvedFile === null) {
            return
          }

          for (const binding of readImportedRoleBindings(statement, resolvedFile)) {
            const referencingRoles = readReferencingRoles(binding.localName)
            for (const importedRole of binding.roles) {
              const forbiddenByRoles = referencingRoles.filter((roleName) =>
                roleMap.get(roleName)?.forbiddenDependencies?.includes(importedRole),
              )
              if (forbiddenByRoles.length === 0) {
                continue
              }
              report(
                statement,
                `Forbidden dependency: this file (${forbiddenByRoles.join(', ')}) cannot import from a file exporting '${importedRole}'. ${referenceForKnownRole(options, importedRole)}`,
              )
            }
          }
        }

        function readImportedRoleBindings(statement, resolvedFile) {
          return (statement.specifiers ?? []).flatMap((specifier) => {
            if (specifier.type === 'ImportSpecifier') {
              const importedName =
                specifier.imported.type === 'Identifier'
                  ? specifier.imported.name
                  : specifier.imported.value
              const importedRole = readExportedRole(resolvedFile, importedName)
              return importedRole === null
                ? []
                : [{
                  localName: specifier.local.name,
                  roles: [importedRole],
                }]
            }
            if (
              specifier.type === 'ImportNamespaceSpecifier' ||
              specifier.type === 'ImportDefaultSpecifier'
            ) {
              return [{
                localName: specifier.local.name,
                roles: readAllExportedRoles(resolvedFile),
              }]
            }
            return []
          })
        }

        function readReferencingRoles(localName) {
          const references = readImportReferences(localName)
          if (references.length === 0) {
            return []
          }
          const referencingRoles = roleDeclarations
            .filter(({ node }) => declarationReachesReferences(node, references, new Set()))
            .map(({ roleName }) => roleName)
          return referencingRoles.length > 0
            ? [...new Set(referencingRoles)]
            : [...new Set(fileRoles)]
        }

        function declarationReachesReferences(node, targetReferences, visitedNodes) {
          if (visitedNodes.has(node)) {
            return false
          }
          visitedNodes.add(node)
          if (targetReferences.some((reference) => isNodeInside(reference, node))) {
            return true
          }

          for (const variable of readLocalVariables()) {
            const isReferencedByDeclaration = variable.references.some((reference) =>
              isNodeInside(reference.identifier, node),
            )
            if (!isReferencedByDeclaration) {
              continue
            }
            for (const definition of variable.defs ?? []) {
              const dependencyNode = definition.node
              if (
                dependencyNode?.range !== undefined &&
                declarationReachesReferences(dependencyNode, targetReferences, visitedNodes)
              ) {
                return true
              }
            }
          }
          return false
        }

        function readLocalVariables() {
          const variables = []
          for (const scope of sourceCode.scopeManager?.scopes ?? []) {
            for (const variable of scope.variables ?? []) {
              if (variable.defs?.some((definition) => definition.type !== 'ImportBinding')) {
                variables.push(variable)
              }
            }
          }
          return variables
        }

        function readImportReferences(localName) {
          const references = []
          for (const scope of sourceCode.scopeManager?.scopes ?? []) {
            for (const variable of scope.variables ?? []) {
              const isMatchingImport =
                variable.name === localName &&
                variable.defs?.some((definition) => definition.type === 'ImportBinding')
              if (isMatchingImport) {
                references.push(...variable.references.map((reference) => reference.identifier))
              }
            }
          }
          return references
        }

        function readAllExportedRoles(filePath) {
          const sourceText = readFileText(filePath)
          if (sourceText === null) {
            return []
          }

          const roles = []
          const lines = sourceText.split('\n')
          for (let i = 0; i < lines.length; i++) {
            const roleName = parseSingleRoleName(lines[i], `at ${filePath}:${i + 1}`)
            if (roleName === null) {
              continue
            }

            for (let j = i + 1; j < lines.length; j++) {
              const trimmed = lines[j].trim()
              if (trimmed === '' || trimmed.startsWith('*') || trimmed.startsWith('/**')) {
                continue
              }
              if (/^export\s+(?:interface|type|function|class)\s+\w+/.test(trimmed)) {
                roles.push(roleName)
              }
              break
            }
          }
          return roles
        }

        function validateFunctionContract(node, role, name) {
          if (Array.isArray(role.allowedInputs)) {
            if (node.params.length !== 1) {
              report(
                node,
                `Role '${role.name}' must accept exactly one parameter on '${name}'. ${referenceForKnownRole(options, role.name)}`,
              )
              return
            }

            const inputRole = readTypeRole(node.params[0].typeAnnotation, filename)
            if (inputRole === null || !role.allowedInputs.includes(inputRole)) {
              report(
                node,
                `Role '${role.name}' only allows inputs [${role.allowedInputs.join(', ')}] on '${name}'. ${referenceForKnownRole(options, role.name)}`,
              )
              return
            }
          }

          if (Array.isArray(role.allowedOutputs)) {
            const outputRoles = readOutputTypeRoles(node.returnType, filename)
            if (outputRoles === null || !outputRoles.every((r) => role.allowedOutputs.includes(r))) {
              report(
                node,
                `Role '${role.name}' only allows outputs [${role.allowedOutputs.join(', ')}] on '${name}'. ${referenceForKnownRole(options, role.name)}`,
              )
            }
          }
        }

        function validateClassContract(node, role, name) {
          validatePublicMethodCount(node, role, name)
          validateRequiredPrivateMembers(node, role, name)
          validateCallableMemberConstraints(node, role, name)
          validateDataMemberRequirements(node, role, name)
          validateClassMethodContracts(node, role, name)
        }

        function validatePublicMethodCount(node, role, name) {
          if (typeof role.minPublicMethods === 'number') {
            const publicMethodCount = countPublicMethods(node)
            if (publicMethodCount < role.minPublicMethods) {
              report(
                node,
                `Role '${role.name}' requires at least ${role.minPublicMethods} public method(s) on '${name}'. ${referenceForKnownRole(options, role.name)}`,
              )
            }
          }

          if (typeof role.maxPublicMethods === 'number') {
            const maxCount = countPublicMethods(node)
            if (maxCount > role.maxPublicMethods) {
              report(
                node,
                `Role '${role.name}' allows at most ${role.maxPublicMethods} public method(s) on '${name}'. ${referenceForKnownRole(options, role.name)}`,
              )
            }
          }
        }

        function validateRequiredPrivateMembers(node, role, name) {
          if (!Array.isArray(role.requiredPrivateMembers)) {
            return
          }

          for (const privateMemberName of role.requiredPrivateMembers) {
            if (!hasRequiredPrivateMember(node, privateMemberName)) {
              report(
                node,
                `Role '${role.name}' requires private member '${privateMemberName}' on '${name}'. ${referenceForKnownRole(options, role.name)}`,
              )
            }
          }
        }

        function validateClassMethodContracts(node, role, name) {
          if (!hasClassMethodContracts(role)) {
            return
          }

          for (const member of node.body.body) {
            if (
              member.type === 'MethodDefinition' &&
              member.kind !== 'constructor' &&
              (member.accessibility === 'public' || member.accessibility == null)
            ) {
              const methodName = member.key?.name ?? '?'
              validateFunctionContract(member.value, role, `${name}.${methodName}`)
            }
          }
        }

        function hasClassMethodContracts(role) {
          return Array.isArray(role.allowedInputs) || Array.isArray(role.allowedOutputs)
        }

        function validateCallableMemberConstraints(node, role, name) {
          if (role.forbiddenCallableMembers !== true) {
            return
          }

          const callableMemberNames = readCallableInstanceMemberNames(node)
          if (callableMemberNames.length === 0) {
            return
          }

          report(
            node,
            `Role '${role.name}' forbids callable instance members on '${name}'. Found [${callableMemberNames.join(', ')}]. ${referenceForKnownRole(options, role.name)}`,
          )
        }

        function validateDataMemberRequirements(node, role, name) {
          if (role.requiresDataMembers !== true) {
            return
          }

          const excludedMemberNames = new Set(normalizeRequiredPrivateMembers(role))
          const hasDataMember = readInstanceDataMembers(node).some(
            (member) => !member.callable && !excludedMemberNames.has(member.name),
          )
          if (hasDataMember) {
            return
          }

          report(
            node,
            `Role '${role.name}' requires at least one non-callable instance data member on '${name}'. ${referenceForKnownRole(options, role.name)}`,
          )
        }

        function countPublicMethods(classNode) {
          return classNode.body.body.filter(
            (member) =>
              member.type === 'MethodDefinition' &&
              member.kind !== 'constructor' &&
              (member.accessibility === 'public' || member.accessibility == null),
          ).length
        }

        function hasRequiredPrivateMember(classNode, privateMemberName) {
          const normalizedPrivateMemberName = normalizeRequiredPrivateMemberName(privateMemberName)
          return classNode.body.body.some(
            (member) =>
              isPrivateMember(member) &&
              readMemberName(member.key) === normalizedPrivateMemberName,
          )
        }

        function normalizeRequiredPrivateMemberName(privateMemberName) {
          return privateMemberName.startsWith('#')
            ? privateMemberName.slice(1)
            : privateMemberName
        }

        function normalizeRequiredPrivateMembers(role) {
          if (!Array.isArray(role.requiredPrivateMembers)) {
            return []
          }

          return role.requiredPrivateMembers.map(normalizeRequiredPrivateMemberName)
        }

        function isPrivateMember(member) {
          return (
            member.accessibility === 'private' ||
            member.key?.type === 'PrivateIdentifier'
          )
        }

        function readCallableInstanceMemberNames(classNode) {
          return readInstanceDataMembers(classNode)
            .filter((member) => member.callable)
            .map((member) => member.name)
        }

        function readInstanceDataMembers(classNode) {
          return classNode.body.body.flatMap((member) => {
            if (isStaticMember(member)) {
              return []
            }

            if (isDataFieldMember(member)) {
              const name = readMemberName(member.key)
              return name === null
                ? []
                : [{
                  callable: isCallableFieldMember(member),
                  name,
                }]
            }

            if (isConstructorDefinition(member)) {
              return member.value.params.flatMap(readConstructorParameterProperty)
            }

            return []
          })
        }

        function isStaticMember(member) {
          return member.static === true
        }

        function isDataFieldMember(member) {
          return (
            member.type === 'PropertyDefinition' ||
            member.type === 'AccessorProperty' ||
            member.type === 'ClassProperty' ||
            member.type === 'FieldDefinition'
          )
        }

        function isConstructorDefinition(member) {
          return member.type === 'MethodDefinition' && member.kind === 'constructor'
        }

        function readConstructorParameterProperty(param) {
          if (param.type !== 'TSParameterProperty') {
            return []
          }

          const parameter = unwrapParameterProperty(param.parameter)
          if (parameter?.type !== 'Identifier') {
            return []
          }

          return [{
            callable: isCallableParameterProperty(param, parameter),
            name: parameter.name,
          }]
        }

        function unwrapParameterProperty(parameter) {
          return parameter?.type === 'AssignmentPattern'
            ? parameter.left
            : parameter
        }

        function isCallableFieldMember(member) {
          return (
            isCallableTypeAnnotation(member.typeAnnotation) ||
            isFunctionExpression(member.value)
          )
        }

        function isCallableParameterProperty(param, parameter) {
          return (
            isCallableTypeAnnotation(parameter.typeAnnotation) ||
            isFunctionExpression(param.parameter?.right)
          )
        }

        function isCallableTypeAnnotation(typeAnnotation) {
          return typeAnnotation?.type === 'TSTypeAnnotation' &&
            typeAnnotation.typeAnnotation?.type === 'TSFunctionType'
        }

        function isFunctionExpression(node) {
          return node?.type === 'ArrowFunctionExpression' || node?.type === 'FunctionExpression'
        }

        function readMemberName(key) {
          if (key?.type === 'Identifier' || key?.type === 'PrivateIdentifier') {
            return key.name
          }

          if (key?.type === 'Literal' && typeof key.value === 'string') {
            return key.value
          }

          return null
        }

        function readOutputTypeRoles(typeAnnotation, currentFile) {
          if (typeAnnotation === null || typeAnnotation === undefined) {
            return null
          }
          if (typeAnnotation.type !== 'TSTypeAnnotation') {
            return null
          }
          return resolveTypeNodeRoles(typeAnnotation.typeAnnotation, currentFile)
        }

        function resolveTypeNodeRoles(typeNode, currentFile) {
          if (typeNode.type === 'TSUnionType') {
            const memberRoleSets = typeNode.types.map((member) =>
              resolveTypeNodeRoles(member, currentFile),
            )
            if (memberRoleSets.some((roles) => roles === null)) {
              return null
            }
            return memberRoleSets.flat()
          }

          if (typeNode.type === 'TSArrayType') {
            return resolveTypeNodeRoles(typeNode.elementType, currentFile)
          }

          if (
            typeNode.type === 'TSTypeReference' &&
            typeNode.typeName?.type === 'Identifier' &&
            typeNode.typeName.name === 'Promise'
          ) {
            const typeArgs = typeNode.typeArguments?.params ?? typeNode.typeParameters?.params
            if (!Array.isArray(typeArgs) || typeArgs.length !== 1) {
              return null
            }
            return resolveTypeNodeRoles(typeArgs[0], currentFile)
          }

          if (typeNode.type === 'TSVoidKeyword') {
            return []
          }

          if (typeNode.type === 'TSTypeReference' && typeNode.typeName?.type === 'Identifier') {
            const localTypeName = typeNode.typeName.name
            const importedReference = readImportedReference(localTypeName, currentFile)
            const resolvedRole =
              importedReference !== null
                ? readExportedRole(importedReference.filePath, importedReference.exportedName)
                : readExportedRole(currentFile, localTypeName)
            return resolvedRole !== null ? [resolvedRole] : null
          }

          return null
        }

        function readTypeRole(typeAnnotation, currentFile) {
          if (typeAnnotation === null || typeAnnotation === undefined) {
            return null
          }

          if (typeAnnotation.type !== 'TSTypeAnnotation') {
            return null
          }

          const innerType = unwrapSupportedTypeReference(typeAnnotation.typeAnnotation)
          if (innerType === null) {
            return null
          }

          const localTypeName = innerType.typeName.name
          const importedReference = readImportedReference(localTypeName, currentFile)
          if (importedReference !== null) {
            return readExportedRole(importedReference.filePath, importedReference.exportedName)
          }

          return readExportedRole(currentFile, localTypeName)
        }

        function unwrapSupportedTypeReference(typeNode) {
          if (typeNode.type !== 'TSTypeReference' || typeNode.typeName.type !== 'Identifier') {
            return null
          }

          if (typeNode.typeName.name !== 'Promise') {
            return typeNode
          }

          const promiseTypeArguments =
            typeNode.typeArguments?.params ?? typeNode.typeParameters?.params
          if (!Array.isArray(promiseTypeArguments) || promiseTypeArguments.length !== 1) {
            return null
          }

          return unwrapSupportedTypeReference(promiseTypeArguments[0])
        }

        function readImportedReference(localTypeName, currentFile) {
          const cacheKey = `${currentFile}::${localTypeName}`
          if (importCache.has(cacheKey)) {
            return importCache.get(cacheKey)
          }

          for (const statement of sourceCode.ast.body) {
            const importedReference = readImportDeclarationReference(
              statement,
              localTypeName,
              currentFile,
            )
            if (importedReference !== undefined) {
              importCache.set(cacheKey, importedReference)
              return importedReference
            }
          }

          const workspaceRef = readWorkspacePackageReference(localTypeName)
          importCache.set(cacheKey, workspaceRef)
          return workspaceRef
        }

        function readWorkspacePackageReference(localTypeName) {
          const workspacePackageSources = options.workspacePackageSources ?? {}
          for (const statement of sourceCode.ast.body) {
            const ref = readWorkspaceImportStatement(statement, localTypeName, workspacePackageSources)
            if (ref !== null) {
              return ref
            }
          }
          return null
        }

        function readWorkspaceImportStatement(statement, localTypeName, workspacePackageSources) {
          if (statement.type !== 'ImportDeclaration') {
            return null
          }
          const importSource = statement.source.value
          if (typeof importSource !== 'string' || importSource.startsWith('.')) {
            return null
          }
          const specifier = (statement.specifiers ?? []).find(
            (s) => s.type === 'ImportSpecifier' && s.local.name === localTypeName,
          )
          if (specifier === undefined) {
            return null
          }
          const sourcePackage = Object.entries(workspacePackageSources).find(
            ([packageName]) =>
              importSource === packageName || importSource.startsWith(`${packageName}/`),
          )
          if (sourcePackage === undefined) {
            return null
          }
          const [packageName, packageEntry] = sourcePackage
          const packageSubpath = importSource.slice(packageName.length + 1)
          const sourceEntry = packageSubpath === ''
            ? packageEntry
            : path.join(path.dirname(packageEntry), packageSubpath)
          const resolvedSourcePath = resolveTypeFile(path.join(options.configDir, '_'), sourceEntry)
          if (resolvedSourcePath === null) {
            return null
          }
          const importedName =
            specifier.imported.type === 'Identifier'
              ? specifier.imported.name
              : specifier.imported.value
          return {
            exportedName: importedName,
            filePath: resolvedSourcePath,
          }
        }

        function readExportedRole(filePath, exportedName) {
          const exportedFile = resolveExportedFile(filePath, exportedName)
          if (exportedFile === null) {
            return null
          }
          return readDirectExportRole(exportedFile, exportedName)
        }

        function readDirectExportRole(filePath, exportedName) {
          const sourceText = readFileText(filePath)
          if (sourceText === null) {
            return null
          }
          const escapedName = escapeRegExp(exportedName)
          const exportPattern = new RegExp(
            String.raw`export\s+(?:interface|type|function|class)\s+${escapedName}\b`,
            'm',
          )
          const exportMatch = exportPattern.exec(sourceText)
          if (exportMatch === null) {
            return null
          }
          const prefix = sourceText.slice(0, exportMatch.index)
          const jsDocComments = [...prefix.matchAll(/\/\*\*[\s\S]*?\*\//g)]
          const commentMatch = jsDocComments.at(-1)
          if (commentMatch?.[0] === undefined) {
            return null
          }
          return parseSingleRoleName(commentMatch[0], `on '${exportedName}' in ${filePath}`)
        }

        function resolveExportedFile(filePath, exportedName, visited = new Set()) {
          if (visited.has(filePath)) {
            return null
          }
          visited.add(filePath)

          const sourceText = readFileText(filePath)
          if (sourceText === null) {
            return null
          }

          const escapedName = escapeRegExp(exportedName)
          const exportPattern = new RegExp(
            String.raw`export\s+(?:interface|type|function|class)\s+${escapedName}\b`,
            'm',
          )
          const exportMatch = exportPattern.exec(sourceText)
          if (exportMatch !== null) {
            return filePath
          }

          const namedReExportPattern = new RegExp(
            String.raw`export\s*(?:type\s*)?\{[^}]*\b${escapedName}\b[^}]*\}\s*from\s*['"]([^'"]+)['"]`,
            'm',
          )
          const namedReExportMatch = namedReExportPattern.exec(sourceText)
          if (namedReExportMatch !== null) {
            const resolvedPath = resolveTypeFile(filePath, namedReExportMatch[1])
            if (resolvedPath !== null) {
              return resolveExportedFile(resolvedPath, exportedName, visited)
            }
          }

          const wildcardReExportPattern = /export\s*\*\s*from\s*['"]([^'"]+)['"]/gm
          let wildcardMatch
          while ((wildcardMatch = wildcardReExportPattern.exec(sourceText)) !== null) {
            const resolvedPath = resolveTypeFile(filePath, wildcardMatch[1])
            if (resolvedPath !== null) {
              const exportedFile = resolveExportedFile(resolvedPath, exportedName, visited)
              if (exportedFile !== null) {
                return exportedFile
              }
            }
          }

          return null
        }

        function readFileText(filePath) {
          if (fileCache.has(filePath)) {
            return fileCache.get(filePath)
          }

          if (!fs.existsSync(filePath)) {
            fileCache.set(filePath, null)
            return null
          }

          const fileText = fs.readFileSync(filePath, 'utf8')
          fileCache.set(filePath, fileText)
          return fileText
        }

        function report(node, message) {
          context.report({
            message,
            node,
          })
        }
      },
    },
  },
}

function resolveLocationChain(filePath, locations) {
  const matches = locations
    .map((location) => {
      const templateSegments = location.pathTemplate.split('/')
      const fileSegments = filePath.split('/')
      if (fileSegments.length < templateSegments.length) {
        return null
      }
      for (let index = 0; index < templateSegments.length; index += 1) {
        const expected = templateSegments[index]
        if (!isTemplateSegment(expected) && expected !== fileSegments[index]) {
          return null
        }
      }
      return {
        concretePath: fileSegments.slice(0, templateSegments.length).join('/'),
        location,
      }
    })
    .filter((entry) => entry !== null)
    .sort(
      (left, right) =>
        left.location.pathTemplate.split('/').length -
        right.location.pathTemplate.split('/').length,
    )
  const mostSpecificByDepth = new Map()
  for (const match of matches) {
    const depth = match.location.pathTemplate.split('/').length
    const existing = mostSpecificByDepth.get(depth)
    if (
      existing === undefined ||
      templateSegmentCount(match.location.pathTemplate) <
        templateSegmentCount(existing.location.pathTemplate)
    ) {
      mostSpecificByDepth.set(depth, match)
    }
  }
  return [...mostSpecificByDepth.values()].sort(
    (left, right) =>
      left.location.pathTemplate.split('/').length -
      right.location.pathTemplate.split('/').length,
  )
}

function isTemplateSegment(segment) {
  return segment.startsWith('{') && segment.endsWith('}')
}

function templateSegmentCount(template) {
  return template.split('/').filter(isTemplateSegment).length
}

function relativeSegments(candidate, parent) {
  if (candidate === parent) {
    return []
  }
  if (!candidate.startsWith(`${parent}/`)) {
    return []
  }
  return candidate.slice(parent.length + 1).split('/')
}

function isWithinPath(candidate, parent) {
  return candidate === parent || candidate.startsWith(`${parent}/`)
}

function locationById(locations, id) {
  if (id === undefined) {
    return undefined
  }
  return locations.find((location) => location.id === id)
}

function sameConcreteParentWhenSharedTemplate(source, target, locations) {
  const sourceParent = locationById(locations, source.location.parentId)
  const targetParent = locationById(locations, target.location.parentId)
  if (sourceParent?.pathTemplate !== targetParent?.pathTemplate) {
    return true
  }
  const segmentCount = sourceParent.pathTemplate.split('/').length
  const sourceParentPath = source.concretePath.split('/').slice(0, segmentCount).join('/')
  const targetParentPath = target.concretePath.split('/').slice(0, segmentCount).join('/')
  return sourceParentPath === targetParentPath
}

function locationNameMatches(configuredName, targetName) {
  if (!configuredName.endsWith('/*')) {
    return configuredName === targetName
  }
  return targetName.startsWith(configuredName.slice(0, -1))
}

function collectForbiddenMethodCallRoles(fileRoles, roleMap) {
  const forbiddenSet = new Set()
  for (const roleName of fileRoles) {
    const role = roleMap.get(roleName)
    if (role !== undefined && Array.isArray(role.forbiddenMethodCalls)) {
      for (const dep of role.forbiddenMethodCalls) {
        forbiddenSet.add(dep)
      }
    }
  }
  return forbiddenSet
}

function isTopLevelExported(node) {
  const exportParent = readAnnotationNode(node)
  return (
    exportParent.parent?.type === 'Program' &&
    (exportParent.type === 'ExportNamedDeclaration' ||
      exportParent.type === 'ExportDefaultDeclaration')
  )
}

function readAnnotationNode(node) {
  return node.parent?.type === 'ExportNamedDeclaration' ||
    node.parent?.type === 'ExportDefaultDeclaration'
    ? node.parent
    : node
}

function readDeclarationName(node) {
  if ('id' in node && node.id != null) {
    return node.id.name
  }

  if ('key' in node && node.key?.type === 'Identifier') {
    return node.key.name
  }

  return 'id' in node && 'name' in node ? node.name : null
}

function readRoleNames(sourceCode, node) {
  const comments = sourceCode.getCommentsBefore(node)
  const roleNames = comments.flatMap((comment) => parseAllRoleNames(comment.value))
  return [...new Set(roleNames)]
}

function matchesApprovedInstances(name, role) {
  if (!Array.isArray(role.approvedInstances)) {
    return { checked: false }
  }

  const entry = role.approvedInstances.find((instance) => instance.name === name)

  if (!entry) {
    return {
      checked: true,
      passed: false,
      reason: `'${name}' is not in approvedInstances for role '${role.name}'. Add { name: '${name}', userHasApproved: true } to approvedInstances after getting user approval.`,
    }
  }

  if (entry.userHasApproved !== true) {
    return {
      checked: true,
      passed: false,
      reason: `'${name}' has userHasApproved: false in approvedInstances for role '${role.name}'. Set userHasApproved to true after getting user approval.`,
    }
  }

  return {
    checked: true,
    passed: true,
  }
}

function matchesName(name, role) {
  if (Array.isArray(role.allowedNames)) {
    return role.allowedNames.includes(name)
  }

  if (typeof role.nameMatches === 'string') {
    return new RegExp(role.nameMatches, 'u').test(name)
  }

  return true
}

function resolveTypeFile(currentFile, importSource) {
  const sourceDir = path.dirname(currentFile)
  const basePath = path.resolve(sourceDir, importSource)
  return resolveFileFromBase(basePath)
}

function resolveImportFile(currentFile, importSource, configDir, importAliases = {}) {
  if (importSource.startsWith('.')) {
    return resolveTypeFile(currentFile, importSource)
  }

  const alias = Object.entries(importAliases).find(([prefix]) => importSource.startsWith(prefix))
  if (alias !== undefined) {
    const [prefix, target] = alias
    const aliasedPath = path.resolve(configDir, target, importSource.slice(prefix.length))
    return resolveFileFromBase(aliasedPath)
  }

  return resolveWorkspacePackageSource(currentFile, importSource)
}

function resolveFileFromBase(basePath) {
  const candidates = [
    basePath,
    `${basePath}.ts`,
    `${basePath}.tsx`,
    path.join(basePath, 'index.ts'),
    path.join(basePath, 'index.tsx'),
  ]
  return candidates.find(isFile) ?? null
}

function isFile(candidate) {
  try {
    return fs.statSync(candidate).isFile()
  } catch {
    return false
  }
}

function resolveWorkspacePackageSource(currentFile, importSource) {
  const packageName = readPackageName(importSource)
  if (packageName === null) {
    return null
  }

  try {
    const packageJsonPath = createRequire(currentFile).resolve(`${packageName}/package.json`)
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
    const sourceEntry = packageJson.exports?.['.']?.['@living-architecture/source']
    if (typeof sourceEntry !== 'string') {
      return null
    }
    return resolveTypeFile(packageJsonPath, sourceEntry)
  } catch {
    return null
  }
}

function readPackageName(importSource) {
  const segments = importSource.split('/')
  if (importSource.startsWith('@')) {
    return segments.length >= 2 ? `${segments[0]}/${segments[1]}` : null
  }
  return segments[0] ?? null
}

function isInsideDirectory(filePath, directoryPath) {
  const relativePath = path.relative(directoryPath, filePath)
  return relativePath !== '' && !relativePath.startsWith('..') && !path.isAbsolute(relativePath)
}

function isNodeInside(candidate, container) {
  return candidate.range[0] >= container.range[0] && candidate.range[1] <= container.range[1]
}

function normalizePath(value) {
  return value.replaceAll('\\', '/')
}

function readRelativeFilePath(filename, configDir) {
  return path.isAbsolute(filename) ? path.relative(configDir, filename) : filename
}

function escapeRegExp(value) {
  return value.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)
}

function readImportDeclarationReference(statement, localTypeName, currentFile) {
  if (statement.type !== 'ImportDeclaration') {
    return undefined
  }

  if (typeof statement.source.value !== 'string' || !statement.source.value.startsWith('.')) {
    return undefined
  }

  const importedSpecifier = (statement.specifiers ?? []).find(
    (specifier) => specifier.type === 'ImportSpecifier' && specifier.local.name === localTypeName,
  )
  if (importedSpecifier === undefined) {
    return undefined
  }

  const importedName =
    importedSpecifier.imported.type === 'Identifier'
      ? importedSpecifier.imported.name
      : importedSpecifier.imported.value
  const resolvedFile = resolveTypeFile(currentFile, statement.source.value)
  if (resolvedFile === null) {
    return null
  }

  return {
    exportedName: importedName,
    filePath: resolvedFile,
  }
}
