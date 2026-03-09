import type { TargetSymbol } from '../domain/target-symbol'
import {
  createRoleAssignmentIssue, parseRoleAssignment 
} from './role-assignment'

export interface BaseNode {
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

export interface CommentToken {value: string}

export interface SourceCodeLike {getCommentsBefore: (node: BaseNode) => readonly CommentToken[]}

interface IdentifierNode extends BaseNode {
  type: 'Identifier'
  name: string
}

interface NamedKeyNode extends BaseNode {
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
  body: readonly (MethodDefinitionNode | BaseNode)[]
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

export interface ProgramNode extends BaseNode {
  type: 'Program'
  body: readonly StatementNode[]
}

interface ReportableTarget extends TargetSymbol {reportNode: BaseNode}

export interface RoleTargetExtractionIssue {
  code: 'duplicate-role-assignment' | 'malformed-role-assignment'
  message: string
  reportNode: BaseNode
}

export interface RoleTargetExtractionResult {
  targets: readonly ReportableTarget[]
  issues: readonly RoleTargetExtractionIssue[]
}

function isIdentifierNode(node: BaseNode | null): node is IdentifierNode {
  return node?.type === 'Identifier'
}

function isNamedKeyNode(node: BaseNode | null): node is NamedKeyNode {
  return typeof node === 'object' && node !== null && 'name' in node && typeof node.name === 'string'
}

function isFunctionExpressionNode(node: BaseNode | null): node is FunctionExpressionNode {
  return node?.type === 'ArrowFunctionExpression' || node?.type === 'FunctionExpression'
}

export function isProgramNode(node: BaseNode): node is ProgramNode {
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

function isMethodDefinitionNode(node: BaseNode): node is MethodDefinitionNode {
  return node.type === 'MethodDefinition'
}

function getPublicMethodNames(classDeclaration: ClassDeclarationNode): readonly string[] {
  return classDeclaration.body.body.flatMap((classElement) => {
    if (!isMethodDefinitionNode(classElement) || classElement.kind !== 'method') {
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
): RoleTargetExtractionResult {
  if (!isIdentifierNode(declaration.id)) {
    return {
      targets: [],
      issues: [],
    }
  }

  const assignment = parseRoleAssignment(sourceCode, annotationNodes)
  const baseTarget = {
    kind: 'class' as const,
    name: declaration.id.name,
    ownerClassName: null,
  }

  const staticMethodTargets = createStaticMethodTargets(declaration, relativeFilePath, sourceCode)

  if (assignment.issue !== null) {
    return {
      targets: staticMethodTargets.targets,
      issues: [
        createRoleAssignmentIssue(baseTarget, relativeFilePath, declaration.id, assignment.issue),
        ...staticMethodTargets.issues,
      ],
    }
  }

  return {
    targets: [
      {
        ...baseTarget,
        assignedRoleName: assignment.assignedRoleName,
        relativeFilePath,
        publicMethodNames: getPublicMethodNames(declaration),
        reportNode: declaration.id,
      },
      ...staticMethodTargets.targets,
    ],
    issues: staticMethodTargets.issues,
  }
}

function createStaticMethodTargets(
  declaration: ClassDeclarationNode,
  relativeFilePath: string,
  sourceCode: SourceCodeLike,
): RoleTargetExtractionResult {
  if (!isIdentifierNode(declaration.id)) {
    return {
      targets: [],
      issues: [],
    }
  }

  return declaration.body.body.reduce<RoleTargetExtractionResult>(
    (result, classElement) => {
      if (
        !isMethodDefinitionNode(classElement) ||
        classElement.kind !== 'method' ||
        classElement.static !== true ||
        classElement.computed === true ||
        !isNamedKeyNode(classElement.key)
      ) {
        return result
      }

      const assignment = parseRoleAssignment(sourceCode, [classElement, classElement.key])
      const baseTarget = {
        kind: 'static-method' as const,
        name: classElement.key.name,
        ownerClassName: declaration.id.name,
      }

      if (assignment.issue !== null) {
        return {
          targets: result.targets,
          issues: [
            ...result.issues,
            createRoleAssignmentIssue(
              baseTarget,
              relativeFilePath,
              classElement.key,
              assignment.issue,
            ),
          ],
        }
      }

      return {
        targets: [
          ...result.targets,
          {
            ...baseTarget,
            assignedRoleName: assignment.assignedRoleName,
            relativeFilePath,
            publicMethodNames: [],
            reportNode: classElement.key,
          },
        ],
        issues: result.issues,
      }
    },
    {
      targets: [],
      issues: [],
    },
  )
}

function createFunctionTargets(
  declaration: VariableDeclarationNode,
  annotationNodes: readonly BaseNode[],
  relativeFilePath: string,
  sourceCode: SourceCodeLike,
): RoleTargetExtractionResult {
  const assignment = parseRoleAssignment(sourceCode, annotationNodes)

  return declaration.declarations.reduce<RoleTargetExtractionResult>(
    (result, declarator) => {
      if (!isIdentifierNode(declarator.id) || !isFunctionExpressionNode(declarator.init)) {
        return result
      }

  const baseTarget = {
    kind: 'function' as const,
    name: declarator.id.name,
    ownerClassName: null,
  }

      if (assignment.issue !== null) {
        return {
          targets: result.targets,
          issues: [
            ...result.issues,
            createRoleAssignmentIssue(
              baseTarget,
              relativeFilePath,
              declarator.id,
              assignment.issue,
            ),
          ],
        }
      }

      return {
        targets: [
          ...result.targets,
          {
            ...baseTarget,
            assignedRoleName: assignment.assignedRoleName,
            relativeFilePath,
            publicMethodNames: [],
            reportNode: declarator.id,
          },
        ],
        issues: result.issues,
      }
    },
    {
      targets: [],
      issues: [],
    },
  )
}

function createFunctionDeclarationTarget(
  declaration: FunctionDeclarationNode,
  annotationNodes: readonly BaseNode[],
  relativeFilePath: string,
  sourceCode: SourceCodeLike,
): RoleTargetExtractionResult {
  if (!isIdentifierNode(declaration.id)) {
    return {
      targets: [],
      issues: [],
    }
  }

  const assignment = parseRoleAssignment(sourceCode, annotationNodes)
  const baseTarget = {
    kind: 'function' as const,
    name: declaration.id.name,
    ownerClassName: null,
  }

  if (assignment.issue !== null) {
    return {
      targets: [],
      issues: [
        createRoleAssignmentIssue(baseTarget, relativeFilePath, declaration.id, assignment.issue),
      ],
    }
  }

  return {
    targets: [
      {
        ...baseTarget,
        assignedRoleName: assignment.assignedRoleName,
        relativeFilePath,
        publicMethodNames: [],
        reportNode: declaration.id,
      },
    ],
    issues: [],
  }
}

function createDeclarationTargets(
  declaration: ExportableDeclarationNode | null,
  annotationNode: BaseNode,
  relativeFilePath: string,
  sourceCode: SourceCodeLike,
): RoleTargetExtractionResult {
  if (declaration === null) {
    return {
      targets: [],
      issues: [],
    }
  }

  const annotationNodes = [annotationNode, declaration]

  switch (declaration.type) {
    case 'ClassDeclaration':
      /* v8 ignore start -- defensive guard after discriminant narrowing */
      if (!isClassDeclarationNode(declaration)) {
        return {
          targets: [],
          issues: [],
        }
      }
      /* v8 ignore stop */

      return createClassTarget(declaration, annotationNodes, relativeFilePath, sourceCode)
    case 'FunctionDeclaration':
      /* v8 ignore start -- defensive guard after discriminant narrowing */
      if (!isFunctionDeclarationNode(declaration)) {
        return {
          targets: [],
          issues: [],
        }
      }
      /* v8 ignore stop */

      return createFunctionDeclarationTarget(
        declaration,
        annotationNodes,
        relativeFilePath,
        sourceCode,
      )
    case 'VariableDeclaration':
      /* v8 ignore start -- defensive guard after discriminant narrowing */
      if (!isVariableDeclarationNode(declaration)) {
        return {
          targets: [],
          issues: [],
        }
      }
      /* v8 ignore stop */

      return createFunctionTargets(declaration, annotationNodes, relativeFilePath, sourceCode)
    default:
      return {
        targets: [],
        issues: [],
      }
  }
}

export function extractRoleTargets(
  program: ProgramNode,
  sourceCode: SourceCodeLike,
  relativeFilePath: string,
): RoleTargetExtractionResult {
  return program.body.reduce<RoleTargetExtractionResult>(
    (result, statement) => {
      if (!isExportNamedDeclarationNode(statement) && !isExportDefaultDeclarationNode(statement)) {
        return result
      }

      const extracted = createDeclarationTargets(
        statement.declaration,
        statement,
        relativeFilePath,
        sourceCode,
      )

      return {
        targets: [...result.targets, ...extracted.targets],
        issues: [...result.issues, ...extracted.issues],
      }
    },
    {
      targets: [],
      issues: [],
    },
  )
}
