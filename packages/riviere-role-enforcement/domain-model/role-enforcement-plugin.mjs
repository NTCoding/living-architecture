import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { minimatch } from 'minimatch'

const ROLE_TAG = /@riviere-role\s+(\S+)/g
const DECORATOR_CONTEXT_TYPES = new Set([
  'ClassAccessorDecoratorContext',
  'ClassDecoratorContext',
  'ClassFieldDecoratorContext',
  'ClassGetterDecoratorContext',
  'ClassMethodDecoratorContext',
  'ClassSetterDecoratorContext',
])

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
          VariableDeclaration(node) {
            validateVariableDeclaration(node)
          },
          ImportDeclaration(node) {
            if (isTestFile) {
              return
            }
            validateHierarchyImport(node, sourceLocationChain)
          },
          ExportNamedDeclaration(node) {
            if (!isTestFile && node.source !== null) {
              validateHierarchyImport(node, sourceLocationChain)
            }
          },
          ExportAllDeclaration(node) {
            if (!isTestFile) {
              validateHierarchyImport(node, sourceLocationChain)
            }
          },
          ImportExpression(node) {
            if (!isTestFile) {
              validateDependencyExpression(node, node.source, sourceLocationChain)
            }
          },
          TSImportType(node) {
            if (!isTestFile) {
              validateDependencyExpression(node, node.source, sourceLocationChain)
            }
          },
          CallExpression(node) {
            if (
              !isTestFile &&
              node.callee.type === 'Identifier' &&
              node.callee.name === 'require'
            ) {
              validateDependencyExpression(node, node.arguments[0], sourceLocationChain)
            }
          },
          'Program:exit'() {
            if (isTestFile) {
              return
            }
            validateForbiddenDependencies()
            validateForbiddenImportedFunctionCalls()
            validateForbiddenMethodCalls()
          },
        }

        function validateVariableDeclaration(node) {
          if (!isTopLevelExported(node)) {
            return
          }
          if (node.declarations.length !== 1 || node.declarations[0]?.id.type !== 'Identifier') {
            report(node, 'An exported variable declaration must declare exactly one named variable.')
            return
          }
          validateDeclaration(node, 'variable')
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
            if (matchesAnyPattern(targetRelative, options.ignorePatterns ?? [])) {
              report(node, `Production code cannot import ignored file '${targetRelative}'.`)
              return
            }
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

        function validateDependencyExpression(node, source, sourceChain) {
          const importSource = readStringLiteralValue(source)
          if (importSource === null) {
            report(node, 'Dependency target must be a string literal so its location can be checked.')
            return
          }
          validateHierarchyImport(
            {
              ...node,
              source: { value: importSource },
              specifiers: [],
            },
            sourceChain,
          )
        }

        function resolveImportedFiles(node, resolvedImport) {
          const files = []
          for (const specifier of node.specifiers ?? []) {
            if (specifier.type !== 'ImportSpecifier' && specifier.type !== 'ExportSpecifier') {
              continue
            }
            const imported =
              specifier.type === 'ImportSpecifier' ? specifier.imported : specifier.local
            const importedName =
              imported.type === 'Identifier' ? imported.name : imported.value
            const exportedFile = resolveExportedFile(resolvedImport, importedName)
            if (exportedFile !== null) {
              files.push(exportedFile)
            }
          }
          return files.length > 0 ? [...new Set(files)] : [resolvedImport]
        }

        function validateSourceLocationRules(node, sourceChain, targetChain, targetRelative, resolvedImport) {
          return rejectsLocationImport(
            node,
            sourceChain,
            targetChain,
            targetRelative,
            resolvedImport,
          )
        }

        function rejectsLocationImport(node, sourceChain, targetChain, targetRelative, resolvedImport) {
          const effectiveRules = effectiveImportRules(sourceChain)
          if (
            effectiveRules === null ||
            isWithinPath(targetRelative, effectiveRules.restrictedLocation.concretePath)
          ) {
            return false
          }
          const permitted = effectiveRules.allowedImports.some(({ rule, source: ruleSource }) =>
            locationRuleAllows(rule, ruleSource, targetChain, node, resolvedImport),
          )
          if (permitted) {
            return false
          }
          const source = effectiveRules.restrictedLocation
          const targetName = targetChain.at(-1).location.name
          report(node, `Location '${source.location.name}' cannot import location '${targetName}'.`)
          return true
        }

        function validateTargetLocationRules(node, targetChain) {
          for (const target of targetChain) {
            if (target.location.importRules?.importableFrom !== 'withinParentLocation') {
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

        function effectiveImportRules(sourceChain) {
          let effectiveRules = null
          for (const source of sourceChain) {
            const importRules = source.location.importRules
            if (importRules === undefined) {
              continue
            }
            const inheritedImports =
              importRules.inheritParentImportRules === false
                ? []
                : effectiveRules?.allowedImports ?? []
            effectiveRules = {
              allowedImports: [
                ...inheritedImports,
                ...expandAllowedImports(importRules.allow).map((rule) => ({ rule, source })),
              ],
              restrictedLocation: source,
            }
          }
          return effectiveRules
        }

        function locationRuleAllows(rule, source, targetChain, node, resolvedImport) {
          const candidates = targetChain.filter((target) =>
            locationRuleMatches(rule, source, target, locationHierarchy),
          )
          if (candidates.length === 0) {
            return false
          }
          if (!Array.isArray(rule.roles)) {
            return true
          }
          const importedRoles = readImportedRoles(node, resolvedImport)
          return importedRoles.length > 0 && importedRoles.every((role) => rule.roles.includes(role))
        }

        function readImportedRoles(node, resolvedImport) {
          const roles = (node.specifiers ?? []).flatMap((specifier) =>
            readSpecifierRoles(specifier, resolvedImport),
          )
          return [...new Set(roles.length === 0 ? readAllExportedRoles(resolvedImport) : roles)]
        }

        function readSpecifierRoles(specifier, resolvedImport) {
          if (specifier.type === 'ImportNamespaceSpecifier') {
            return readAllExportedRoles(resolvedImport)
          }
          if (specifier.type === 'ImportSpecifier') {
            return readNamedExportRole(resolvedImport, specifier.imported)
          }
          if (specifier.type === 'ExportSpecifier') {
            return readNamedExportRole(resolvedImport, specifier.local)
          }
          return []
        }

        function readNamedExportRole(resolvedImport, imported) {
          if (imported === null || imported === undefined) {
            return []
          }
          const importedName = imported.type === 'Identifier' ? imported.name : imported.value
          const importedRole = readExportedRole(resolvedImport, importedName)
          return importedRole === null ? [] : [importedRole]
        }

        function validateDeclaration(node, target) {
          if (isTestFile) {
            return
          }
          if (sourceLocationChain.some(({ location }) => location.roleEnforcement === false)) {
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

          validateRoleContract(node, target, role, name)
        }

        function validateRoleContract(node, target, role, name) {
          if (target === 'function') {
            validateFunctionContract(node, role, name)
          } else if (target === 'class') {
            validateClassContract(node, role, name)
          } else if (target === 'variable') {
            validateVariableContract(node, role, name)
          } else if (target === 'interface') {
            validateInterfaceContract(node, role, name)
          } else if (target === 'type-alias') {
            validateTypeAliasContract(node, role, name)
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
          const location = resolveLocationChain(filePath, locationHierarchy).at(-1)
          return location?.location.allowedRoles.includes(roleName) === true
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

        function validateForbiddenImportedFunctionCalls() {
          if (!fileRoles.some((roleName) => roleMap.get(roleName)?.forbiddenImportedFunctionCalls)) {
            return
          }

          const importedFunctionBindings = new Set()
          for (const statement of sourceCode.ast.body) {
            if (statement.type !== 'ImportDeclaration' || statement.importKind === 'type') {
              continue
            }
            for (const specifier of statement.specifiers ?? []) {
              if (
                specifier.type === 'ImportSpecifier' &&
                specifier.importKind !== 'type'
              ) {
                importedFunctionBindings.add(specifier.local.name)
              }
            }
          }

          if (importedFunctionBindings.size === 0) {
            return
          }

          const nonImportBody = sourceCode.ast.body.filter(
            (node) => node.type !== 'ImportDeclaration',
          )
          for (const node of nonImportBody) {
            walkForImportedFunctionCalls(node, importedFunctionBindings)
          }
        }

        function walkForImportedFunctionCalls(node, importedFunctionBindings) {
          if (node === null || node === undefined || typeof node !== 'object') {
            return
          }

          if (
            node.type === 'CallExpression' &&
            node.callee.type === 'Identifier' &&
            importedFunctionBindings.has(node.callee.name)
          ) {
            report(
              node,
              `Role '${fileRoles.join(', ')}' forbids direct invocation of imported function '${node.callee.name}'. Pass the dependency through a constructor or parameter.`,
            )
            return
          }

          for (const key of Object.keys(node)) {
            if (key === 'parent') {
              continue
            }
            const child = node[key]
            if (Array.isArray(child)) {
              for (const item of child) {
                walkForImportedFunctionCalls(item, importedFunctionBindings)
              }
            } else if (child !== null && typeof child === 'object' && child.type !== undefined) {
              walkForImportedFunctionCalls(child, importedFunctionBindings)
            }
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
          if (role.requiresDecoratorSignature === true && !hasDecoratorSignature(node)) {
            report(
              node,
              `Role '${role.name}' requires a decorator signature on '${name}'. ${referenceForKnownRole(options, role.name)}`,
            )
            return
          }

          if (Array.isArray(role.returns)) {
            validateReturnShapes(node, role, name)
          }

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

        function validateReturnShapes(node, role, name) {
          const returnType = unwrapTypeAnnotation(node.returnType)
          if (returnType?.type !== 'TSUnionType') {
            report(
              node,
              `Role '${role.name}' requires explicit success and failure return branches on '${name}'. ${referenceForKnownRole(options, role.name)}`,
            )
            return
          }

          for (const requiredShape of role.returns) {
            const branch = returnType.types.find(
              (member) => readSuccessDiscriminator(member) === requiredShape.success,
            )
            if (branch === undefined) {
              report(
                node,
                `Role '${role.name}' requires explicit success and failure return branches on '${name}'. ${referenceForKnownRole(options, role.name)}`,
              )
              return
            }

            const values = readNonDiscriminatorProperties(branch)
            if (values.length === 0) {
              report(
                node,
                `Role '${role.name}' requires a value on its ${requiredShape.success ? 'success' : 'failure'} branch on '${name}'. ${referenceForKnownRole(options, role.name)}`,
              )
              return
            }

            const requiredRole = requiredShape['*']
            if (
              requiredRole !== '*' &&
              !values.some((property) => readTypeRole(property.typeAnnotation, filename) === requiredRole)
            ) {
              report(
                node,
                `Role '${role.name}' requires its ${requiredShape.success ? 'success' : 'failure'} branch to return role '${requiredRole}' on '${name}'. ${referenceForKnownRole(options, role.name)}`,
              )
              return
            }
          }
        }

        function readSuccessDiscriminator(typeNode) {
          if (typeNode.type !== 'TSTypeLiteral') {
            return null
          }
          const successProperty = typeNode.members.find(
            (member) => member.type === 'TSPropertySignature' && readMemberName(member.key) === 'success',
          )
          const successType = unwrapTypeAnnotation(successProperty?.typeAnnotation)
          if (successType?.type !== 'TSLiteralType') {
            return null
          }
          const literal = successType.literal
          return literal?.type === 'Literal' && typeof literal.value === 'boolean'
            ? literal.value
            : null
        }

        function readNonDiscriminatorProperties(typeNode) {
          if (typeNode.type !== 'TSTypeLiteral') {
            return []
          }
          return typeNode.members.filter(
            (member) =>
              member.type === 'TSPropertySignature' && readMemberName(member.key) !== 'success',
          )
        }

        function validateVariableContract(node, role, name) {
          if (role.requiresStringLiteralConstant !== true) {
            return
          }
          const initializer = unwrapExpression(node.declarations[0]?.init)
          if (node.kind === 'const' && isStringLiteral(initializer)) {
            return
          }
          report(
            node,
            `Role '${role.name}' requires a string-literal constant on '${name}'. ${referenceForKnownRole(options, role.name)}`,
          )
        }

        function validateInterfaceContract(node, role, name) {
          if (role.mustBeDataStructure !== true) {
            return
          }
          const hasCallableMember = hasCallableTypeMembers(node.body.body)
          if (hasCallableMember) {
            report(
              node,
              `Role '${role.name}' does not allow methods on '${name}'. ${referenceForKnownRole(options, role.name)}`,
            )
          }
        }

        function validateTypeAliasContract(node, role, name) {
          if (role.mustBeDataStructure === true) {
            const result = inspectDataStructureType(node.typeAnnotation)
            if (!result.isDataStructure) {
              report(
                node,
                `Role '${role.name}' must be a data structure on '${name}'. ${referenceForKnownRole(options, role.name)}`,
              )
              return
            }
            if (result.hasCallableMember) {
              report(
                node,
                `Role '${role.name}' does not allow methods on '${name}'. ${referenceForKnownRole(options, role.name)}`,
              )
              return
            }
          }
          if (role.requiresUnion !== true || node.typeAnnotation.type === 'TSUnionType') {
            return
          }
          report(
            node,
            `Role '${role.name}' requires a union type on '${name}'. ${referenceForKnownRole(options, role.name)}`,
          )
        }

        function inspectDataStructureType(typeNode) {
          if (typeNode.type === 'TSTypeLiteral') {
            return {
              isDataStructure: true,
              hasCallableMember: hasCallableTypeMembers(typeNode.members),
            }
          }
          if (typeNode.type === 'TSUnionType' || typeNode.type === 'TSIntersectionType') {
            const members = typeNode.types.map(inspectDataStructureType)
            return {
              isDataStructure: members.every((member) => member.isDataStructure),
              hasCallableMember: members.some((member) => member.hasCallableMember),
            }
          }
          if (isZodInferType(typeNode)) {
            return { isDataStructure: true, hasCallableMember: false }
          }
          return { isDataStructure: false, hasCallableMember: false }
        }

        function isZodInferType(typeNode) {
          return (
            typeNode.type === 'TSTypeReference' &&
            typeNode.typeName?.type === 'TSQualifiedName' &&
            typeNode.typeName.left?.type === 'Identifier' &&
            typeNode.typeName.left.name === 'z' &&
            typeNode.typeName.right?.type === 'Identifier' &&
            typeNode.typeName.right.name === 'infer'
          )
        }

        function hasCallableTypeMembers(members) {
          return members.some((member) => {
            if (
              member.type === 'TSMethodSignature' ||
              member.type === 'TSCallSignatureDeclaration' ||
              member.type === 'TSConstructSignatureDeclaration'
            ) {
              return true
            }
            return (
              member.type === 'TSPropertySignature' &&
              isCallableTypeAnnotation(member.typeAnnotation)
            )
          })
        }

        function unwrapExpression(node) {
          if (
            node?.type === 'TSAsExpression' ||
            node?.type === 'TSTypeAssertion' ||
            node?.type === 'TSNonNullExpression' ||
            node?.type === 'TSInstantiationExpression'
          ) {
            return unwrapExpression(node.expression)
          }
          return node
        }

        function isStringLiteral(node) {
          return (
            (node?.type === 'Literal' && typeof node.value === 'string') ||
            (node?.type === 'StringLiteral' && typeof node.value === 'string')
          )
        }

        function readStringLiteralValue(node) {
          if (node?.type === 'TSLiteralType') {
            return readStringLiteralValue(node.literal)
          }
          return isStringLiteral(node) ? node.value : null
        }

        function hasDecoratorSignature(node) {
          if (hasDecoratorParameters(node.params)) {
            return true
          }

          const returnType = unwrapTypeAnnotation(node.returnType)
          return returnType?.type === 'TSFunctionType' && hasDecoratorParameters(returnType.params)
        }

        function hasDecoratorParameters(params) {
          return params.length === 2 && containsDecoratorContextType(params[1]?.typeAnnotation)
        }

        function containsDecoratorContextType(typeAnnotation) {
          const typeNode = unwrapTypeAnnotation(typeAnnotation)
          if (typeNode?.type === 'TSUnionType') {
            return typeNode.types.some(containsDecoratorContextType)
          }
          if (typeNode?.type !== 'TSTypeReference' || typeNode.typeName?.type !== 'Identifier') {
            return false
          }
          return DECORATOR_CONTEXT_TYPES.has(typeNode.typeName.name)
        }

        function unwrapTypeAnnotation(typeAnnotation) {
          return typeAnnotation?.type === 'TSTypeAnnotation'
            ? typeAnnotation.typeAnnotation
            : typeAnnotation
        }

        function validateClassContract(node, role, name) {
          validatePublicMethodCount(node, role, name)
          validateRequiredPrivateMembers(node, role, name)
          validateRequiredPrivateConstructor(node, role, name)
          validateRequiredStaticMethodNamePrefix(node, role, name)
          validateCallableMemberConstraints(node, role, name)
          validateDataMemberRequirements(node, role, name)
          validateClassMethodContracts(node, role, name)
        }

        function validateRequiredPrivateConstructor(node, role, name) {
          if (role.requiresPrivateConstructor !== true) {
            return
          }

          const constructor = node.body.body.find(
            (member) => member.type === 'MethodDefinition' && member.kind === 'constructor',
          )
          if (constructor?.accessibility === 'private') {
            return
          }

          report(
            node,
            `Role '${role.name}' requires a private constructor on '${name}'. ${referenceForKnownRole(options, role.name)}`,
          )
        }

        function validateRequiredStaticMethodNamePrefix(node, role, name) {
          if (typeof role.requiredStaticMethodNamePrefix !== 'string') {
            return
          }

          const hasRequiredStaticMethod = node.body.body.some(
            (member) =>
              member.type === 'MethodDefinition' &&
              member.static === true &&
              member.kind !== 'constructor' &&
              readMemberName(member.key)?.startsWith(role.requiredStaticMethodNamePrefix) === true,
          )
          if (hasRequiredStaticMethod) {
            return
          }

          report(
            node,
            `Role '${role.name}' requires at least one static method beginning with '${role.requiredStaticMethodNamePrefix}' on '${name}'. ${referenceForKnownRole(options, role.name)}`,
          )
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
          if (role.forbiddenCallableDataMembers !== true) {
            return
          }

          const callableMemberNames = readCallableInstanceMemberNames(node)
          if (callableMemberNames.length === 0) {
            return
          }

          report(
            node,
            `Role '${role.name}' forbids callable instance data members on '${name}'. Found [${callableMemberNames.join(', ')}]. ${referenceForKnownRole(options, role.name)}`,
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
              options.configDir,
              options.importAliases,
            )
            if (importedReference !== undefined) {
              importCache.set(cacheKey, importedReference)
              return importedReference
            }
          }

          importCache.set(cacheKey, null)
          return null
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

function matchesAnyPattern(filePath, patterns) {
  return patterns.some((pattern) => minimatch(filePath, pattern, { dot: true }))
}

function resolveLocationChain(filePath, locations) {
  const fileDirectorySegments = normalizePath(path.dirname(filePath)).split('/')
  const matches = locations
    .map((location) => {
      const templateSegments = location.pathTemplate.split('/')
      if (fileDirectorySegments.length < templateSegments.length) {
        return null
      }
      for (let index = 0; index < templateSegments.length; index += 1) {
        const expected = templateSegments[index]
        if (!isTemplateSegment(expected) && expected !== fileDirectorySegments[index]) {
          return null
        }
      }
      return {
        concretePath: fileDirectorySegments.slice(0, templateSegments.length).join('/'),
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

function locationRuleMatches(rule, source, target, locations) {
  if (typeof rule.sibling === 'string') {
    return siblingRuleMatches(rule.sibling, source, target, locations)
  }
  if (typeof rule.ownSubdomain === 'string') {
    return ownSubdomainRuleMatches(rule.ownSubdomain, source, target)
  }
  if (typeof rule.anySubdomain === 'string') {
    return anySubdomainRuleMatches(rule.anySubdomain, target)
  }
  return rootRuleMatches(rule.root, source, target, locations)
}

function expandAllowedImports(allowedScopes) {
  return Object.entries(allowedScopes ?? {}).flatMap(([scope, allowedLocations]) =>
    allowedLocations.flatMap((allowedLocation) => {
      if (typeof allowedLocation === 'string') {
        return [{ [scope]: allowedLocation }]
      }
      return Object.entries(allowedLocation).map(([location, roles]) => ({
        [scope]: location,
        roles,
      }))
    }),
  )
}

function ownSubdomainRuleMatches(configuredLocation, source, target) {
  if (!locationNameMatches(`/${configuredLocation}`, target.location.name)) {
    return false
  }
  return haveSameSubdomain(source, target)
}

function anySubdomainRuleMatches(configuredLocation, target) {
  if (!locationNameMatches(`/${configuredLocation}`, target.location.name)) {
    return false
  }
  return readPackageBoundaries(
    target.location.packagePath,
    concretePackagePath(target),
  ).has('subdomain')
}

function haveSameSubdomain(source, target) {
  const sourceBoundaries = readPackageBoundaries(
    source.location.packagePath,
    concretePackagePath(source),
  )
  const targetBoundaries = readPackageBoundaries(
    target.location.packagePath,
    concretePackagePath(target),
  )
  const sourceSubdomain = sourceBoundaries.get('subdomain')
  return (
    sourceSubdomain !== undefined && sourceSubdomain === targetBoundaries.get('subdomain')
  )
}

function readPackageBoundaries(packagePattern, concretePath) {
  const patternSegments = packagePattern.split('/')
  const concreteSegments = concretePath.split('/')
  const boundaries = new Map()
  for (const [index, segment] of patternSegments.entries()) {
    if (!isTemplateSegment(segment)) {
      continue
    }
    const concreteSegment = concreteSegments[index]
    if (concreteSegment !== undefined) {
      boundaries.set(segment.slice(1, -1), concreteSegment)
    }
  }
  return boundaries
}

function siblingRuleMatches(configuredLocation, source, target, locations) {
  if (!locationNameMatches(`/${configuredLocation}`, target.location.name)) {
    return false
  }
  return hasSameConcreteParent(source, target, locations)
}

function rootRuleMatches(configuredLocation, source, target, locations) {
  if (!locationNameMatches(`/${configuredLocation}`, target.location.name)) {
    return false
  }
  return isRootLocationInSourcePackage(source, target, locations)
}

function hasSameConcreteParent(source, target, locations) {
  const sourceParent = locationById(locations, source.location.parentId)
  const targetParent = locationById(locations, target.location.parentId)
  if (sourceParent?.pathTemplate !== targetParent?.pathTemplate) {
    return false
  }
  const segmentCount = sourceParent.pathTemplate.split('/').length
  const sourceParentPath = source.concretePath.split('/').slice(0, segmentCount).join('/')
  const targetParentPath = target.concretePath.split('/').slice(0, segmentCount).join('/')
  return sourceParentPath === targetParentPath
}

function isRootLocationInSourcePackage(source, target, locations) {
  const targetParent = locationById(locations, target.location.parentId)
  return (
    concretePackagePath(target) === concretePackagePath(source) &&
    targetParent?.pathTemplate === `${source.location.packagePath}/src`
  )
}

function concretePackagePath(location) {
  const segmentCount = location.location.packagePath.split('/').length
  return location.concretePath.split('/').slice(0, segmentCount).join('/')
}

function locationNameMatches(configuredName, targetName) {
  return targetName === configuredName || targetName.startsWith(`${configuredName}/`)
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
  if (node.type === 'VariableDeclaration') {
    const declaration = node.declarations.length === 1 ? node.declarations[0] : undefined
    return declaration?.id.type === 'Identifier' ? declaration.id.name : null
  }

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
    const packageSubpath = importSource.slice(packageName.length)
    const exportKey = packageSubpath === '' ? '.' : `.${packageSubpath}`
    const sourceEntry = resolvePackageSourceExport(packageJson.exports, exportKey)
    if (typeof sourceEntry !== 'string') {
      return null
    }
    return resolveTypeFile(packageJsonPath, sourceEntry)
  } catch {
    return null
  }
}

function resolvePackageSourceExport(exports, exportKey) {
  if (typeof exports !== 'object' || exports === null) {
    return null
  }

  const directExport = exports[exportKey]
  if (typeof directExport?.['@living-architecture/source'] === 'string') {
    return directExport['@living-architecture/source']
  }

  for (const [pattern, value] of Object.entries(exports)) {
    const wildcardIndex = pattern.indexOf('*')
    if (wildcardIndex === -1 || typeof value?.['@living-architecture/source'] !== 'string') {
      continue
    }
    const prefix = pattern.slice(0, wildcardIndex)
    const suffix = pattern.slice(wildcardIndex + 1)
    if (!exportKey.startsWith(prefix) || !exportKey.endsWith(suffix)) {
      continue
    }
    const wildcardValue = exportKey.slice(prefix.length, exportKey.length - suffix.length)
    return value['@living-architecture/source'].replaceAll('*', wildcardValue)
  }

  return null
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

function readImportDeclarationReference(
  statement,
  localTypeName,
  currentFile,
  configDir,
  importAliases,
) {
  if (statement.type !== 'ImportDeclaration') {
    return undefined
  }

  if (typeof statement.source.value !== 'string') {
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
  const resolvedFile = resolveImportFile(currentFile, statement.source.value, configDir, importAliases)
  if (resolvedFile === null) {
    return null
  }

  return {
    exportedName: importedName,
    filePath: resolvedFile,
  }
}
