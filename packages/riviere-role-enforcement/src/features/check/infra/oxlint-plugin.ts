import path from 'node:path'
import { eslintCompatPlugin } from '@oxlint/plugins'
import { checkTargetSymbol } from '../domain/check-role-target'
import type { TargetSymbol } from '../domain/target-symbol'
import { RoleEnforcementConfigError } from '../../../platform/domain/role-enforcement-config-error'
import type { CompiledRoleEnforcementConfig } from '../../../platform/domain/role-enforcement-config'
import { loadRoleEnforcementConfig } from '../../../platform/infra/load-role-enforcement-config'
import { normalizePath } from '../../../platform/infra/path-patterns'

const ROLE_ASSIGNMENT_PATTERN = /@riviere-role\s+([a-z0-9-]+)/

interface BaseNode {
  type: string
  range: [number, number]
  start: number
  end: number
  loc: {
    start: {
      line: number
      column: number
    }
    end: {
      line: number
      column: number
    }
  }
}

interface CommentToken {value: string}

interface SourceCodeLike {getCommentsBefore: (node: BaseNode) => readonly CommentToken[]}

interface IdentifierNode extends BaseNode {
  type: 'Identifier'
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
  key: IdentifierNode | BaseNode
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
  | BaseNode
  | ClassDeclarationNode
  | FunctionDeclarationNode
  | VariableDeclarationNode

type StatementNode = BaseNode | ExportNamedDeclarationNode | ExportDefaultDeclarationNode

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

function getAssignedRoleName(
  sourceCode: SourceCodeLike,
  annotationNodes: readonly BaseNode[],
): string | null {
  for (const annotationNode of annotationNodes) {
    const roleAssignmentComment = sourceCode
      .getCommentsBefore(annotationNode)
      .findLast((comment) => ROLE_ASSIGNMENT_PATTERN.test(comment.value))

    if (roleAssignmentComment !== undefined) {
      const match = ROLE_ASSIGNMENT_PATTERN.exec(roleAssignmentComment.value)

      if (match?.[1] !== undefined) {
        return match[1]
      }
    }
  }

  return null
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
  annotationNodes: readonly BaseNode[],
  relativeFilePath: string,
  sourceCode: SourceCodeLike,
): readonly ReportableTarget[] {
  if (!isIdentifierNode(declaration.id)) {
    return []
  }

  return [
    {
      kind: 'class',
      name: declaration.id.name,
      assignedRoleName: getAssignedRoleName(sourceCode, annotationNodes),
      relativeFilePath,
      publicMethodNames: getPublicMethodNames(declaration),
      reportNode: declaration.id,
    },
  ]
}

function createFunctionTargets(
  declaration: VariableDeclarationNode,
  annotationNodes: readonly BaseNode[],
  relativeFilePath: string,
  sourceCode: SourceCodeLike,
): readonly ReportableTarget[] {
  const assignedRoleName = getAssignedRoleName(sourceCode, annotationNodes)

  return declaration.declarations.flatMap((declarator) => {
    if (!isIdentifierNode(declarator.id) || !isFunctionExpressionNode(declarator.init)) {
      return []
    }

    return [
      {
        kind: 'function',
        name: declarator.id.name,
        assignedRoleName,
        relativeFilePath,
        publicMethodNames: [],
        reportNode: declarator.id,
      },
    ]
  })
}

function createDeclarationTargets(
  declaration: ExportableDeclarationNode | null,
  annotationNode: BaseNode,
  relativeFilePath: string,
  sourceCode: SourceCodeLike,
): readonly ReportableTarget[] {
  if (declaration === null) {
    return []
  }

  const annotationNodes = [annotationNode, declaration]

  switch (declaration.type) {
    case 'ClassDeclaration':
      if (!isClassDeclarationNode(declaration)) {
        return []
      }

      return createClassTarget(declaration, annotationNodes, relativeFilePath, sourceCode)
    case 'FunctionDeclaration':
      if (!isFunctionDeclarationNode(declaration) || !isIdentifierNode(declaration.id)) {
        return []
      }

      return [
        {
          kind: 'function',
          name: declaration.id.name,
          assignedRoleName: getAssignedRoleName(sourceCode, annotationNodes),
          relativeFilePath,
          publicMethodNames: [],
          reportNode: declaration.id,
        },
      ]
    case 'VariableDeclaration':
      if (!isVariableDeclarationNode(declaration)) {
        return []
      }

      return createFunctionTargets(declaration, annotationNodes, relativeFilePath, sourceCode)
    default:
      return []
  }
}

function extractTargets(
  program: ProgramNode,
  sourceCode: SourceCodeLike,
  relativeFilePath: string,
): readonly ReportableTarget[] {
  return program.body.flatMap((statement) => {
    if (isExportNamedDeclarationNode(statement) || isExportDefaultDeclarationNode(statement)) {
      return createDeclarationTargets(
        statement.declaration,
        statement,
        relativeFilePath,
        sourceCode,
      )
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

const plugin = eslintCompatPlugin({
  meta: { name: 'riviere-role' },
  rules: {
    'enforce-role-definitions': {
      meta: {
        type: 'problem',
        docs: {
          description:
            'Enforce repository role definitions for explicitly annotated exported classes and functions',
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
            const targets = extractTargets(node, context.sourceCode, relativeFilePath)

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

export default plugin
