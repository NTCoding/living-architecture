import fs from 'node:fs'
import path from 'node:path'
import { minimatch } from 'minimatch'

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
        const layerEntries = Object.entries(options.layers ?? {})
        const sourceCode = context.sourceCode
        const fileCache = new Map()
        const importCache = new Map()
        const relativeFilePath = normalizePath(
          readRelativeFilePath(context.filename, options.configDir),
        )
        const filename = path.resolve(options.configDir, relativeFilePath)

        if (
          !filename.endsWith('.ts') ||
          filename.endsWith('.spec.ts') ||
          filename.endsWith('.test.ts')
        ) {
          return {}
        }

        const fileRoles = []

        return {
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
            validateForbiddenImports(node)
          },
          'Program:exit'() {
            validateForbiddenDependencies()
            validateForbiddenMethodCalls()
          },
        }

        function validateForbiddenImports(node) {
          const importSource = node.source.value
          if (typeof importSource !== 'string') {
            return
          }

          const resolvedImport = resolveTypeFile(filename, importSource)
          if (resolvedImport === null) {
            return
          }

          const resolvedImportRelative = normalizePath(
            readRelativeFilePath(resolvedImport, options.configDir),
          )

          const fileDir = normalizePath(path.dirname(relativeFilePath))
          for (const [, layer] of layerEntries) {
            if (!layer.paths.some((pattern) => matchesExpandedPattern(fileDir, pattern))) {
              continue
            }

            if (!Array.isArray(layer.forbiddenImports)) {
              continue
            }

            for (const forbiddenPattern of layer.forbiddenImports) {
              if (
                minimatch(resolvedImportRelative, forbiddenPattern, { dot: true }) ||
                minimatch(resolvedImportRelative, `${forbiddenPattern}/**`, { dot: true })
              ) {
                report(
                  node,
                  `Forbidden import: files in this location cannot import from '${forbiddenPattern}'. ${referenceForUnknownRole(options)}`,
                )
              }
            }
          }
        }

        function validateDeclaration(node, target) {
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

          const approvedResult = matchesApprovedInstances(name, role)
          if (approvedResult.checked && !approvedResult.passed) {
            report(node, approvedResult.reason)
            return
          }

          fileRoles.push(roleName)

          if (target === 'function') {
            validateFunctionContract(node, role, name)
          }

          if (target === 'class') {
            validateClassContract(node, role, name)
          }
        }

        function isRoleAllowedInFile(roleName, filePath) {
          const fileDir = normalizePath(path.dirname(filePath))
          return layerEntries.some(
            ([, layer]) =>
              layer.allowedRoles.includes(roleName) &&
              layer.paths.some((pattern) => matchesExpandedPattern(fileDir, pattern)),
          )
        }

        function validateForbiddenDependencies() {
          const forbiddenSet = collectForbiddenRoles(fileRoles, roleMap)
          if (forbiddenSet.size === 0) {
            return
          }

          for (const statement of readRelativeImportStatements()) {
            reportForbiddenImports(statement, forbiddenSet)
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

        function reportForbiddenImports(statement, forbiddenSet) {
          const resolvedFile = resolveTypeFile(filename, statement.source.value)
          if (resolvedFile === null) {
            return
          }

          const importedRoles = readAllExportedRoles(resolvedFile)
          for (const importedRole of importedRoles) {
            if (forbiddenSet.has(importedRole)) {
              report(
                statement,
                `Forbidden dependency: this file (${fileRoles.join(', ')}) cannot import from a file exporting '${importedRole}'. ${referenceForKnownRole(options, importedRole)}`,
              )
            }
          }
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

          if (Array.isArray(role.allowedOutputs)) {
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
        }

        function countPublicMethods(classNode) {
          return classNode.body.body.filter(
            (member) =>
              member.type === 'MethodDefinition' &&
              member.kind !== 'constructor' &&
              (member.accessibility === 'public' || member.accessibility == null),
          ).length
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
          const sourceEntry = workspacePackageSources[importSource]
          if (sourceEntry === undefined) {
            return null
          }
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

        function readExportedRole(filePath, exportedName, visited = new Set()) {
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
            const prefix = sourceText.slice(0, exportMatch.index)
            const jsDocComments = [...prefix.matchAll(/\/\*\*[\s\S]*?\*\//g)]
            const commentMatch = jsDocComments.at(-1)
            if (commentMatch?.[0] === undefined) {
              return null
            }
            return parseSingleRoleName(commentMatch[0], `on '${exportedName}' in ${filePath}`)
          }

          const namedReExportPattern = new RegExp(
            String.raw`export\s*\{[^}]*\b${escapedName}\b[^}]*\}\s*from\s*['"]([^'"]+)['"]`,
            'm',
          )
          const namedReExportMatch = namedReExportPattern.exec(sourceText)
          if (namedReExportMatch !== null) {
            const resolvedPath = resolveTypeFile(filePath, namedReExportMatch[1])
            if (resolvedPath !== null) {
              return readExportedRole(resolvedPath, exportedName, visited)
            }
          }

          const wildcardReExportPattern = /export\s*\*\s*from\s*['"]([^'"]+)['"]/gm
          let wildcardMatch
          while ((wildcardMatch = wildcardReExportPattern.exec(sourceText)) !== null) {
            const resolvedPath = resolveTypeFile(filePath, wildcardMatch[1])
            if (resolvedPath !== null) {
              const role = readExportedRole(resolvedPath, exportedName, visited)
              if (role !== null) {
                return role
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

function matchesExpandedPattern(fileDir, pattern) {
  return expandCommaPath(pattern).some(
    (expanded) =>
      minimatch(fileDir, expanded, { dot: true }) ||
      minimatch(fileDir, `${expanded}/**`, { dot: true }),
  )
}

function expandCommaPath(pattern) {
  const segments = pattern.split('/')
  const segmentAlternatives = segments.map((s) => s.split(','))
  return cartesianProduct(segmentAlternatives).map((combo) => combo.join('/**/'))
}

function cartesianProduct(arrays) {
  return arrays.reduce(
    (acc, alternatives) => acc.flatMap((combo) => alternatives.map((alt) => [...combo, alt])),
    [[]],
  )
}

function collectForbiddenRoles(fileRoles, roleMap) {
  const forbiddenSet = new Set()
  for (const roleName of fileRoles) {
    const role = roleMap.get(roleName)
    if (role !== undefined && Array.isArray(role.forbiddenDependencies)) {
      for (const dep of role.forbiddenDependencies) {
        forbiddenSet.add(dep)
      }
    }
  }
  return forbiddenSet
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
  const candidates = [basePath, `${basePath}.ts`, path.join(basePath, 'index.ts')]

  return (
    candidates.find((candidate) => {
      try {
        return fs.statSync(candidate).isFile()
      } catch {
        return false
      }
    }) ?? null
  )
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
