import path from 'node:path'
import { eslintCompatPlugin } from '@oxlint/plugins'
import { checkTargetSymbol } from '../domain/check-role-target'
import type { TargetSymbol } from '../domain/target-symbol'
import { RoleEnforcementConfigError } from '../../../platform/domain/role-enforcement-config-error'
import { loadRoleEnforcementConfig } from '../../../platform/infra/load-role-enforcement-config'
import { normalizePath } from '../../../platform/infra/path-patterns'
import type { CompiledRoleEnforcementConfig } from '../../../platform/domain/role-enforcement-config'

interface BaseNode {
  type: string
  range: [number, number]
}

interface IdentifierNode extends BaseNode {
  type: 'Identifier'
  name: string
}

interface PrivateIdentifierNode extends BaseNode {
  type: 'PrivateIdentifier'
  name: string
}

interface FunctionDeclarationNode extends BaseNode {
  type: 'FunctionDeclaration'
  id: IdentifierNode | null
}

interface FunctionExpressionNode extends BaseNode {type: 'ArrowFunctionExpression' | 'FunctionExpression'}

interface VariableDeclaratorNode extends BaseNode {
  type: 'VariableDeclarator'
  id: IdentifierNode | BaseNode
  init: FunctionExpressionNode | BaseNode | null
}

interface VariableDeclarationNode extends BaseNode {
  type: 'VariableDeclaration'
  declarations: readonly VariableDeclaratorNode[]
}

interface MethodDefinitionNode extends BaseNode {
  type: 'MethodDefinition'
  kind: string
  static?: boolean
  computed?: boolean
  accessibility?: 'public' | 'private' | 'protected'
  key: IdentifierNode | PrivateIdentifierNode | BaseNode
}

interface ClassBodyNode extends BaseNode {
  type: 'ClassBody'
  body: readonly MethodDefinitionNode[]
}

interface ClassDeclarationNode extends BaseNode {
  type: 'ClassDeclaration'
  id: IdentifierNode | null
  body: ClassBodyNode
}

interface ExportNamedDeclarationNode extends BaseNode {
  type: 'ExportNamedDeclaration'
  declaration: ExportableDeclarationNode | null
}

interface ExportDefaultDeclarationNode extends BaseNode {
  type: 'ExportDefaultDeclaration'
  declaration: ExportableDeclarationNode
}

type ExportableDeclarationNode =
  | ClassDeclarationNode
  | FunctionDeclarationNode
  | VariableDeclarationNode
  | BaseNode

type StatementNode = ExportNamedDeclarationNode | ExportDefaultDeclarationNode | BaseNode

interface ProgramNode extends BaseNode {
  type: 'Program'
  body: readonly StatementNode[]
}

interface ReportableTarget extends TargetSymbol {reportNode: BaseNode}

interface RoleRuleOptions {configPath?: string}

function isIdentifierNode(node: BaseNode | null): node is IdentifierNode {
  return node?.type === 'Identifier'
}

function isFunctionExpressionNode(node: BaseNode | null): node is FunctionExpressionNode {
  return node?.type === 'ArrowFunctionExpression' || node?.type === 'FunctionExpression'
}

function isProgramNode(node: BaseNode): node is ProgramNode {
  return node.type === 'Program'
}

function isClassDeclarationNode(node: BaseNode | null): node is ClassDeclarationNode {
  return node?.type === 'ClassDeclaration'
}

function isFunctionDeclarationNode(node: BaseNode | null): node is FunctionDeclarationNode {
  return node?.type === 'FunctionDeclaration'
}

function isVariableDeclarationNode(node: BaseNode | null): node is VariableDeclarationNode {
  return node?.type === 'VariableDeclaration'
}

function isExportNamedDeclarationNode(node: StatementNode): node is ExportNamedDeclarationNode {
  return node.type === 'ExportNamedDeclaration'
}

function isExportDefaultDeclarationNode(node: StatementNode): node is ExportDefaultDeclarationNode {
  return node.type === 'ExportDefaultDeclaration'
}

function getPublicMethodNames(classDeclaration: ClassDeclarationNode): readonly string[] {
  return classDeclaration.body.body.flatMap((classElement) => {
    if (classElement.type !== 'MethodDefinition' || classElement.kind !== 'method') {
      return []
    }

    if (classElement.static === true || classElement.computed === true) {
      return []
    }

    if (classElement.accessibility === 'private' || classElement.accessibility === 'protected') {
      return []
    }

    return isIdentifierNode(classElement.key) ? [classElement.key.name] : []
  })
}

function createClassTarget(
  declaration: ClassDeclarationNode,
  relativeFilePath: string,
): ReportableTarget[] {
  if (!isIdentifierNode(declaration.id)) {
    return []
  }

  return [
    {
      kind: 'class',
      name: declaration.id.name,
      relativeFilePath,
      publicMethodNames: getPublicMethodNames(declaration),
      reportNode: declaration.id,
    },
  ]
}

function createFunctionTargets(
  declaration: VariableDeclarationNode,
  relativeFilePath: string,
): readonly ReportableTarget[] {
  return declaration.declarations.flatMap((declarator) => {
    if (!isIdentifierNode(declarator.id) || !isFunctionExpressionNode(declarator.init)) {
      return []
    }

    return [
      {
        kind: 'function',
        name: declarator.id.name,
        relativeFilePath,
        publicMethodNames: [],
        reportNode: declarator.id,
      },
    ]
  })
}

function createDeclarationTargets(
  declaration: ExportableDeclarationNode | null,
  relativeFilePath: string,
): readonly ReportableTarget[] {
  if (declaration === null) {
    return []
  }

  switch (declaration.type) {
    case 'ClassDeclaration':
      if (!isClassDeclarationNode(declaration)) {
        return []
      }

      return createClassTarget(declaration, relativeFilePath)
    case 'FunctionDeclaration':
      if (!isFunctionDeclarationNode(declaration)) {
        return []
      }

      if (!isIdentifierNode(declaration.id)) {
        return []
      }

      return [
        {
          kind: 'function',
          name: declaration.id.name,
          relativeFilePath,
          publicMethodNames: [],
          reportNode: declaration.id,
        },
      ]
    case 'VariableDeclaration':
      if (!isVariableDeclarationNode(declaration)) {
        return []
      }

      return createFunctionTargets(declaration, relativeFilePath)
    default:
      return []
  }
}

function extractTargets(
  program: ProgramNode,
  relativeFilePath: string,
): readonly ReportableTarget[] {
  return program.body.flatMap((statement) => {
    if (isExportNamedDeclarationNode(statement) || isExportDefaultDeclarationNode(statement)) {
      return createDeclarationTargets(statement.declaration, relativeFilePath)
    }

    return []
  })
}

function getRuleOptions(context: { options?: readonly unknown[] }): RoleRuleOptions {
  const [firstOption] = context.options ?? []

  if (typeof firstOption !== 'object' || firstOption === null) {
    return {}
  }

  if ('configPath' in firstOption && typeof firstOption.configPath === 'string') {
    return { configPath: firstOption.configPath }
  }

  return {}
}

function getFilename(context: {
  filename?: string;
  getFilename?: () => string 
}): string {
  if (typeof context.getFilename === 'function') {
    return context.getFilename()
  }

  return context.filename ?? '<unknown>'
}

function shouldInspectFile(filename: string): boolean {
  return filename.endsWith('.ts') || filename.endsWith('.tsx')
}

const plugin = eslintCompatPlugin({
  meta: { name: 'riviere-role' },
  rules: {
    'enforce-role-definitions': {
      meta: {
        type: 'problem',
        docs: {
          description:
            'Enforce repository role definitions for exported classes and standalone functions',
        },
        schema: [
          {
            type: 'object',
            properties: { configPath: { type: 'string' } },
            additionalProperties: false,
          },
        ],
      },
      create(context) {
        const options = getRuleOptions(context)

        return {
          Program(node: BaseNode) {
            if (!isProgramNode(node)) {
              return
            }

            const filename = getFilename(context)

            if (!shouldInspectFile(filename)) {
              return
            }

            const configPath = options.configPath ?? './riviere-role-enforcement.yaml'
            const configResult = loadCompiledConfig(configPath)
            const config = configResult.config

            if (config === null) {
              if (configResult.error !== null) {
                context.report({
                  node,
                  message: `Role enforcement config error: ${configResult.error.message}`,
                })
              }
              return
            }

            const relativeFilePath = normalizePath(path.relative(process.cwd(), filename))
            const targets = extractTargets(node, relativeFilePath)

            for (const target of targets) {
              const violations = checkTargetSymbol(target, config)

              for (const violation of violations) {
                context.report({
                  node: target.reportNode,
                  message: violation.message,
                })
              }
            }
          },
        }
      },
    },
  },
})

function loadCompiledConfig(configPath: string): {
  config: CompiledRoleEnforcementConfig | null
  error: RoleEnforcementConfigError | null
} {
  try {
    return {
      config: loadRoleEnforcementConfig(configPath),
      error: null,
    }
  } catch (error) {
    return {
      config: null,
      error:
        error instanceof RoleEnforcementConfigError
          ? error
          : new RoleEnforcementConfigError('Unknown role enforcement config error'),
    }
  }
}

export default plugin
