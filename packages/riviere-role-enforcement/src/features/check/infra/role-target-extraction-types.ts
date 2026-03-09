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

export interface IdentifierNode extends BaseNode {
  type: 'Identifier'
  name: string
}

export interface NamedKeyNode extends BaseNode {name: string}

export interface FunctionDeclarationNode extends BaseNode {
  type: 'FunctionDeclaration'
  id: IdentifierNode | null
}

export interface FunctionExpressionNode extends BaseNode {type: 'ArrowFunctionExpression' | 'FunctionExpression'}

export interface VariableDeclaratorNode extends BaseNode {
  type: 'VariableDeclarator'
  id: IdentifierNode | BaseNode
  init: FunctionExpressionNode | BaseNode | null
}

export interface VariableDeclarationNode extends BaseNode {
  type: 'VariableDeclaration'
  declarations: readonly VariableDeclaratorNode[]
}

export interface MethodDefinitionNode extends BaseNode {
  type: 'MethodDefinition'
  kind: string
  static?: boolean
  computed?: boolean
  accessibility?: 'public' | 'private' | 'protected'
  key: IdentifierNode | BaseNode
}

export interface ClassBodyNode extends BaseNode {
  type: 'ClassBody'
  body: readonly (MethodDefinitionNode | BaseNode)[]
}

export interface ClassDeclarationNode extends BaseNode {
  type: 'ClassDeclaration'
  id: IdentifierNode | null
  body: ClassBodyNode
}

export interface ExportNamedDeclarationNode extends BaseNode {
  type: 'ExportNamedDeclaration'
  declaration: ExportableDeclarationNode | null
}

export interface ExportDefaultDeclarationNode extends BaseNode {
  type: 'ExportDefaultDeclaration'
  declaration: ExportableDeclarationNode
}

export type ExportableDeclarationNode =
  | BaseNode
  | ClassDeclarationNode
  | FunctionDeclarationNode
  | VariableDeclarationNode

export type StatementNode =
  | BaseNode
  | ClassDeclarationNode
  | FunctionDeclarationNode
  | VariableDeclarationNode
  | ExportNamedDeclarationNode
  | ExportDefaultDeclarationNode

export interface ProgramNode extends BaseNode {
  type: 'Program'
  body: readonly StatementNode[]
}

export interface RoleTargetExtractionIssue {
  code: 'duplicate-role-assignment' | 'malformed-role-assignment'
  message: string
  reportNode: BaseNode
}

export interface RoleTargetExtractionResult<TTarget> {
  targets: readonly TTarget[]
  issues: readonly RoleTargetExtractionIssue[]
}

/** @riviere-role role-target-extractor */
export function isIdentifierNode(node: BaseNode | null): node is IdentifierNode {
  return node?.type === 'Identifier'
}

/** @riviere-role role-target-extractor */
export function isNamedKeyNode(node: BaseNode | null): node is NamedKeyNode {
  return typeof node === 'object' && node !== null && 'name' in node && typeof node.name === 'string'
}

/** @riviere-role role-target-extractor */
export function isFunctionExpressionNode(node: BaseNode | null): node is FunctionExpressionNode {
  return node?.type === 'ArrowFunctionExpression' || node?.type === 'FunctionExpression'
}

/** @riviere-role role-target-extractor */
export function isProgramNode(node: BaseNode): node is ProgramNode {
  return node.type === 'Program'
}

/** @riviere-role role-target-extractor */
export function isClassDeclarationNode(node: BaseNode | null): node is ClassDeclarationNode {
  return node?.type === 'ClassDeclaration'
}

/** @riviere-role role-target-extractor */
export function isFunctionDeclarationNode(node: BaseNode | null): node is FunctionDeclarationNode {
  return node?.type === 'FunctionDeclaration'
}

/** @riviere-role role-target-extractor */
export function isVariableDeclarationNode(node: BaseNode | null): node is VariableDeclarationNode {
  return node?.type === 'VariableDeclaration'
}

/** @riviere-role role-target-extractor */
export function isExportNamedDeclarationNode(node: StatementNode): node is ExportNamedDeclarationNode {
  return node.type === 'ExportNamedDeclaration'
}

/** @riviere-role role-target-extractor */
export function isExportDefaultDeclarationNode(
  node: StatementNode,
): node is ExportDefaultDeclarationNode {
  return node.type === 'ExportDefaultDeclaration'
}

/** @riviere-role role-target-extractor */
export function isDirectDeclarationNode(node: StatementNode): node is ExportableDeclarationNode {
  return (
    isClassDeclarationNode(node) ||
    isFunctionDeclarationNode(node) ||
    isVariableDeclarationNode(node)
  )
}

/** @riviere-role role-target-extractor */
export function isMethodDefinitionNode(node: BaseNode): node is MethodDefinitionNode {
  return node.type === 'MethodDefinition'
}
