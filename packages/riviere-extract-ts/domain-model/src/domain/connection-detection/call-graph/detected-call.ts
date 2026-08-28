import type { CallExpression, Node as TsMorphNode, Project, SourceFile, Type } from 'ts-morph'
import { Node, SyntaxKind } from 'ts-morph'
import type { ComponentIndex } from '../component-index'
import { ConnectionDetectionError } from '../connection-detection-error'
import { CallSite } from './call-graph-types'
import type { CallableReference } from './callable-reference'
import { ResolvedCallTarget } from './resolved-call-target'

const UNRESOLVABLE_TYPES = new Set(['any', 'unknown', 'object'])

/** @riviere-role value-object */
export class DetectedCall {
  declare private readonly brand: 'DetectedCall'
  readonly source: CallableReference
  readonly receiverTypeName: string | undefined
  readonly calledMethodName: string
  readonly callSite: CallSite
  readonly unresolvedReason: string | undefined

  static parse(params: {
    source: CallableReference
    receiverTypeName?: string
    calledMethodName: string
    callSite: CallSite
    unresolvedReason?: string
  }): DetectedCall {
    return new DetectedCall(params)
  }

  static fromCallable(
    callable: CallableReference,
    project: Project,
    strict: boolean,
  ): readonly DetectedCall[] {
    const declaration = findCallableDeclaration(project, callable)
    if (declaration === undefined) return []
    return declaration
      .getDescendantsOfKind(SyntaxKind.CallExpression)
      .flatMap((callExpression) => detectCall(callExpression, callable, strict))
  }

  private constructor(params: {
    source: CallableReference
    receiverTypeName?: string
    calledMethodName: string
    callSite: CallSite
    unresolvedReason?: string
  }) {
    this.source = params.source
    this.receiverTypeName = params.receiverTypeName
    this.calledMethodName = params.calledMethodName
    this.callSite = params.callSite
    this.unresolvedReason = params.unresolvedReason
  }

  resolveTarget(input: {
    project: Project
    sourceFilePaths: readonly string[]
    componentIndex: ComponentIndex
    strict: boolean
  }): ResolvedCallTarget {
    return ResolvedCallTarget.fromDetectedCall(this, input)
  }
}

function findCallableDeclaration(project: Project, callable: CallableReference) {
  if (callable.kind === 'synthetic') return undefined
  const sourceFile = project.getSourceFile(callable.filePath)
  if (sourceFile === undefined) return undefined
  if (callable.kind === 'function') {
    return sourceFile
      .getFunctions()
      .find((candidate) => candidate.getStartLineNumber() === callable.lineNumber)
  }
  for (const classDeclaration of sourceFile.getClasses()) {
    const method = classDeclaration
      .getMethods()
      .find((candidate) => candidate.getStartLineNumber() === callable.lineNumber)
    if (method !== undefined) return method
  }
  return undefined
}

function detectCall(
  callExpression: CallExpression,
  source: CallableReference,
  strict: boolean,
): DetectedCall[] {
  const expression = callExpression.getExpression()
  if (!Node.isPropertyAccessExpression(expression)) return []
  const callSite = CallSite.parse({
    filePath: callExpression.getSourceFile().getFilePath(),
    lineNumber: callExpression.getStartLineNumber(),
    methodName: source.callableName,
  })
  const receiver = expression.getExpression()
  const rawTypeName = resolveReceiverTypeName(receiver)
  if (UNRESOLVABLE_TYPES.has(rawTypeName)) {
    const reason = `Receiver type is '${rawTypeName}' — no concrete type to resolve`
    if (strict)
      throw detectionError(callExpression.getSourceFile(), callExpression, rawTypeName, reason)
    return [
      DetectedCall.parse({
        source,
        calledMethodName: expression.getName(),
        callSite,
        unresolvedReason: reason,
      }),
    ]
  }
  return [
    DetectedCall.parse({
      source,
      receiverTypeName: stripGenericArguments(rawTypeName),
      calledMethodName: expression.getName(),
      callSite,
    }),
  ]
}

function resolveReceiverTypeName(receiver: TsMorphNode): string {
  if (Node.isCallExpression(receiver)) {
    const returnType = resolveCallExpressionReturnType(receiver)
    if (returnType !== undefined) return returnType
  }
  const rawTypeName = extractTypeName(receiver.getType())
  if (UNRESOLVABLE_TYPES.has(rawTypeName)) {
    return resolveFromVariableDeclaration(receiver) ?? rawTypeName
  }
  return rawTypeName
}

function resolveFromVariableDeclaration(identifier: TsMorphNode): string | undefined {
  if (!Node.isIdentifier(identifier)) return undefined
  const [definition] = identifier.getDefinitionNodes()
  if (definition === undefined || !Node.isVariableDeclaration(definition)) return undefined
  const typeNode = definition.getTypeNode()
  if (typeNode !== undefined) return typeNode.getText()
  const initializer = definition.getInitializer()
  if (!Node.isAwaitExpression(initializer)) return undefined
  const awaited = initializer.getExpression()
  return Node.isCallExpression(awaited) ? resolveCallExpressionReturnType(awaited) : undefined
}

function resolveCallExpressionReturnType(callExpression: CallExpression): string | undefined {
  const expression = callExpression.getExpression()
  if (!Node.isPropertyAccessExpression(expression)) return undefined
  const receiverSymbol = expression.getExpression().getType().getSymbol()
  if (receiverSymbol === undefined) return undefined
  for (const declaration of receiverSymbol.getDeclarations()) {
    if (!Node.isClassDeclaration(declaration)) continue
    const method = declaration.getMethod(expression.getName())
    const returnTypeNode = method?.getReturnTypeNode()
    if (returnTypeNode !== undefined) return stripPromise(returnTypeNode.getText())
  }
  return undefined
}

function extractTypeName(type: Type): string {
  return (type.getSymbol() ?? type.getAliasSymbol())?.getName() ?? type.getText()
}

function stripGenericArguments(typeName: string): string {
  const index = typeName.indexOf('<')
  return index === -1 ? typeName : typeName.slice(0, index)
}

function stripPromise(typeName: string): string {
  return typeName.startsWith('Promise<') && typeName.endsWith('>')
    ? typeName.slice(8, -1)
    : typeName
}

function detectionError(
  sourceFile: SourceFile,
  callExpression: CallExpression,
  typeName: string,
  reason: string,
): ConnectionDetectionError {
  return new ConnectionDetectionError({
    file: sourceFile.getFilePath(),
    line: callExpression.getStartLineNumber(),
    typeName,
    reason,
  })
}
