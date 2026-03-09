import type { TargetSymbol } from '../domain/target-symbol'
import {
  createRoleAssignmentIssue, parseRoleAssignment 
} from './role-assignment'
import {
  isClassDeclarationNode,
  isDirectDeclarationNode,
  isExportDefaultDeclarationNode,
  isExportNamedDeclarationNode,
  isFunctionDeclarationNode,
  isFunctionExpressionNode,
  isIdentifierNode,
  isMethodDefinitionNode,
  isNamedKeyNode,
  isVariableDeclarationNode,
  type BaseNode,
  type ClassDeclarationNode,
  type ExportableDeclarationNode,
  type MethodDefinitionNode,
  type ProgramNode,
  type RoleTargetExtractionResult,
  type SourceCodeLike,
  type StatementNode,
  type VariableDeclarationNode,
} from './role-target-extraction-types'

export {
  isProgramNode,
  type BaseNode,
  type CommentToken,
  type ProgramNode,
  type RoleTargetExtractionIssue,
  type SourceCodeLike,
} from './role-target-extraction-types'

interface ReportableTarget extends TargetSymbol {reportNode: BaseNode}

type ExtractionResult = RoleTargetExtractionResult<ReportableTarget>

interface AnnotatedDeclaration {
  declaration: ExportableDeclarationNode | null
  annotationNode: BaseNode
}

/** @riviere-role role-target-extractor */
function createEmptyResult(): ExtractionResult {
  return {
    targets: [],
    issues: [],
  }
}

/** @riviere-role role-target-extractor */
function mergeResults(left: ExtractionResult, right: ExtractionResult): ExtractionResult {
  return {
    targets: [...left.targets, ...right.targets],
    issues: [...left.issues, ...right.issues],
  }
}

/** @riviere-role role-target-extractor */
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

/** @riviere-role role-target-extractor */
function createClassResult(
  declaration: ClassDeclarationNode,
  annotationNodes: readonly BaseNode[],
  relativeFilePath: string,
  sourceCode: SourceCodeLike,
): ExtractionResult {
  if (!isIdentifierNode(declaration.id)) {
    return createEmptyResult()
  }

  const assignment = parseRoleAssignment(sourceCode, annotationNodes)
  const baseTarget = {
    kind: 'class' as const,
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
        publicMethodNames: getPublicMethodNames(declaration),
        reportNode: declaration.id,
      },
    ],
    issues: [],
  }
}

/** @riviere-role role-target-extractor */
function createStaticMethodResult(
  classDeclaration: ClassDeclarationNode,
  methodDefinition: MethodDefinitionNode,
  relativeFilePath: string,
  sourceCode: SourceCodeLike,
): ExtractionResult {
  if (!isIdentifierNode(classDeclaration.id) || !isNamedKeyNode(methodDefinition.key)) {
    return createEmptyResult()
  }

  const assignment = parseRoleAssignment(sourceCode, [methodDefinition, methodDefinition.key])
  const baseTarget = {
    kind: 'static-method' as const,
    name: methodDefinition.key.name,
    ownerClassName: classDeclaration.id.name,
  }

  if (assignment.issue !== null) {
    return {
      targets: [],
      issues: [
        createRoleAssignmentIssue(
          baseTarget,
          relativeFilePath,
          methodDefinition.key,
          assignment.issue,
        ),
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
        reportNode: methodDefinition.key,
      },
    ],
    issues: [],
  }
}

/** @riviere-role role-target-extractor */
function createStaticMethodResults(
  declaration: ClassDeclarationNode,
  relativeFilePath: string,
  sourceCode: SourceCodeLike,
): ExtractionResult {
  if (!isIdentifierNode(declaration.id)) {
    return createEmptyResult()
  }

  return declaration.body.body.reduce<ExtractionResult>((result, classElement) => {
    if (
      !isMethodDefinitionNode(classElement) ||
      classElement.kind !== 'method' ||
      classElement.static !== true ||
      classElement.computed === true
    ) {
      return result
    }

    return mergeResults(
      result,
      createStaticMethodResult(declaration, classElement, relativeFilePath, sourceCode),
    )
  }, createEmptyResult())
}

/** @riviere-role role-target-extractor */
function createClassTargets(
  declaration: ClassDeclarationNode,
  annotationNodes: readonly BaseNode[],
  relativeFilePath: string,
  sourceCode: SourceCodeLike,
): ExtractionResult {
  return mergeResults(
    createClassResult(declaration, annotationNodes, relativeFilePath, sourceCode),
    createStaticMethodResults(declaration, relativeFilePath, sourceCode),
  )
}

/** @riviere-role role-target-extractor */
function createFunctionTargets(
  declaration: VariableDeclarationNode,
  annotationNodes: readonly BaseNode[],
  relativeFilePath: string,
  sourceCode: SourceCodeLike,
): ExtractionResult {
  const assignment = parseRoleAssignment(sourceCode, annotationNodes)

  return declaration.declarations.reduce<ExtractionResult>((result, declarator) => {
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
          createRoleAssignmentIssue(baseTarget, relativeFilePath, declarator.id, assignment.issue),
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
  }, createEmptyResult())
}

/** @riviere-role role-target-extractor */
function createFunctionDeclarationTarget(
  declaration: ExportableDeclarationNode | null,
  annotationNodes: readonly BaseNode[],
  relativeFilePath: string,
  sourceCode: SourceCodeLike,
): ExtractionResult {
  if (!isFunctionDeclarationNode(declaration) || !isIdentifierNode(declaration.id)) {
    return createEmptyResult()
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

/** @riviere-role role-target-extractor */
function createDeclarationTargets(
  declaration: ExportableDeclarationNode | null,
  annotationNode: BaseNode,
  relativeFilePath: string,
  sourceCode: SourceCodeLike,
): ExtractionResult {
  if (declaration === null) {
    return createEmptyResult()
  }

  const annotationNodes = [annotationNode, declaration]

  if (isClassDeclarationNode(declaration)) {
    return createClassTargets(declaration, annotationNodes, relativeFilePath, sourceCode)
  }

  if (isFunctionDeclarationNode(declaration)) {
    return createFunctionDeclarationTarget(
      declaration,
      annotationNodes,
      relativeFilePath,
      sourceCode,
    )
  }

  if (isVariableDeclarationNode(declaration)) {
    return createFunctionTargets(declaration, annotationNodes, relativeFilePath, sourceCode)
  }

  return createEmptyResult()
}

/** @riviere-role role-target-extractor */
function getAnnotatedDeclaration(statement: StatementNode): AnnotatedDeclaration | null {
  if (isExportNamedDeclarationNode(statement) || isExportDefaultDeclarationNode(statement)) {
    return {
      declaration: statement.declaration,
      annotationNode: statement,
    }
  }

  if (!isDirectDeclarationNode(statement)) {
    return null
  }

  return {
    declaration: statement,
    annotationNode: statement,
  }
}

/** @riviere-role role-target-extractor */
export function extractRoleTargets(
  program: ProgramNode,
  sourceCode: SourceCodeLike,
  relativeFilePath: string,
): ExtractionResult {
  return program.body.reduce<ExtractionResult>((result, statement) => {
    const annotatedDeclaration = getAnnotatedDeclaration(statement)

    if (annotatedDeclaration === null) {
      return result
    }

    return mergeResults(
      result,
      createDeclarationTargets(
        annotatedDeclaration.declaration,
        annotatedDeclaration.annotationNode,
        relativeFilePath,
        sourceCode,
      ),
    )
  }, createEmptyResult())
}
