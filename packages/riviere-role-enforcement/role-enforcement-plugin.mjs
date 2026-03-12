import fs from 'node:fs'
import path from 'node:path'
import { minimatch } from 'minimatch'

const ROLE_TAG = /@riviere-role\s+([a-z][a-z0-9-]*)/g

export default {
  meta: { name: 'riviere-role-enforcement' },
  rules: {
    'enforce-roles': {
      meta: { schema: [{ type: 'object' }] },
      create(context) {
        const [options] = context.options
        const roleMap = new Map(options.roles.map((role) => [role.name, role]))
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
              `Missing @riviere-role annotation for '${name}'. See ${options.configDisplayPath}`,
            )
            return
          }

          if (roleNames.length > 1) {
            report(
              node,
              `Multiple @riviere-role annotations found for '${name}'. See ${options.configDisplayPath}`,
            )
            return
          }

          const [roleName] = roleNames
          const role = roleMap.get(roleName)
          if (role === undefined) {
            report(
              node,
              `Unknown role '${roleName}' on '${name}'. See ${options.configDisplayPath}`,
            )
            return
          }

          if (!role.targets.includes(target)) {
            report(
              node,
              `Role '${roleName}' does not allow target '${target}'. See ${options.configDisplayPath}`,
            )
            return
          }

          if (!matchesAny(relativeFilePath, role.allowedLocation)) {
            report(
              node,
              `${roleName} cannot live in ${relativeFilePath}. See ${options.configDisplayPath}`,
            )
            return
          }

          if (!matchesName(name, role)) {
            report(
              node,
              `Role '${roleName}' does not allow name '${name}'. See ${options.configDisplayPath}`,
            )
            return
          }

          if (target === 'function') {
            validateFunctionContract(node, role, name)
          }
        }

        function validateFunctionContract(node, role, name) {
          if (Array.isArray(role.allowedInputs)) {
            if (node.params.length !== 1) {
              report(
                node,
                `Role '${role.name}' must accept exactly one parameter on '${name}'. See ${options.configDisplayPath}`,
              )
              return
            }

            const inputRole = readTypeRole(node.params[0].typeAnnotation, filename)
            if (inputRole === null || !role.allowedInputs.includes(inputRole)) {
              report(
                node,
                `Role '${role.name}' only allows inputs [${role.allowedInputs.join(', ')}] on '${name}'. See ${options.configDisplayPath}`,
              )
              return
            }
          }

          if (Array.isArray(role.allowedOutputs)) {
            const outputRole = readTypeRole(node.returnType, filename)
            if (outputRole === null || !role.allowedOutputs.includes(outputRole)) {
              report(
                node,
                `Role '${role.name}' only allows outputs [${role.allowedOutputs.join(', ')}] on '${name}'. See ${options.configDisplayPath}`,
              )
            }
          }
        }

        function readTypeRole(typeAnnotation, currentFile) {
          if (typeAnnotation === null || typeAnnotation === undefined) {
            return null
          }

          if (typeAnnotation.type !== 'TSTypeAnnotation') {
            return null
          }

          const innerType = typeAnnotation.typeAnnotation
          if (innerType.type !== 'TSTypeReference' || innerType.typeName.type !== 'Identifier') {
            return null
          }

          const localTypeName = innerType.typeName.name
          const importedReference = readImportedReference(localTypeName, currentFile)
          if (importedReference !== null) {
            return readExportedRole(importedReference.filePath, importedReference.exportedName)
          }

          return readExportedRole(currentFile, localTypeName)
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
            if (importedReference === undefined) {
              continue
            }

            importCache.set(cacheKey, importedReference)
            return importedReference
          }

          importCache.set(cacheKey, null)
          return null
        }

        function readExportedRole(filePath, exportedName) {
          const sourceText = readFileText(filePath)
          if (sourceText === null) {
            return null
          }

          const escapedName = escapeRegExp(exportedName)
          const exportPattern = new RegExp(
            String.raw`/\*\*[\s\S]*?@riviere-role\s+([a-z][a-z0-9-]*)[\s\S]*?\*/\s*export\s+(?:interface|type|function|class)\s+${escapedName}\b`,
            'm',
          )
          const match = sourceText.match(exportPattern)
          return match === null ? null : (match[1] ?? null)
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
  const roleNames = []

  for (const comment of comments) {
    let match = ROLE_TAG.exec(comment.value)
    while (match !== null) {
      roleNames.push(match[1])
      match = ROLE_TAG.exec(comment.value)
    }
    ROLE_TAG.lastIndex = 0
  }

  return [...new Set(roleNames)]
}

function matchesAny(filePath, patterns) {
  return patterns.some((pattern) => minimatch(filePath, pattern, { dot: true }))
}

function matchesName(name, role) {
  if (Array.isArray(role.allowedNames)) {
    return role.allowedNames.includes(name)
  }

  if (typeof role.nameMatches === 'string') {
    return new RegExp(role.nameMatches, 'u').test(name)
  }

  return false
}

function resolveTypeFile(currentFile, importSource) {
  const sourceDir = path.dirname(currentFile)
  const basePath = path.resolve(sourceDir, importSource)
  const candidates = [basePath, `${basePath}.ts`, path.join(basePath, 'index.ts')]

  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null
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
