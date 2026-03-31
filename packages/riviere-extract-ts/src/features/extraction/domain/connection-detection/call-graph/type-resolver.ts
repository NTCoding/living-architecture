import {
  CallExpression, SourceFile, Node 
} from 'ts-morph'
import type { Type } from 'ts-morph'
import { ConnectionDetectionError } from '../connection-detection-error'

interface TypeResolutionSuccess {
  resolved: true
  typeName: string
}

interface TypeResolutionUncertain {
  resolved: false
  reason: string
}

/** @riviere-role value-object */
export type TypeResolution = TypeResolutionSuccess | TypeResolutionUncertain

function stripGenerics(typeName: string): string {
  const angleBracketIndex = typeName.indexOf('<')
  if (angleBracketIndex === -1) return typeName
  return typeName.slice(0, angleBracketIndex)
}

function stripPromise(typeName: string): string {
  if (typeName.startsWith('Promise<') && typeName.endsWith('>')) {
    return typeName.slice(8, -1)
  }
  return typeName
}

const UNRESOLVABLE_TYPES = new Set(['any', 'unknown', 'object'])

function isUnresolvableType(typeName: string): boolean {
  return UNRESOLVABLE_TYPES.has(typeName)
}

function getReceiverExpression(callExpression: CallExpression): Node | undefined {
  const expression = callExpression.getExpression()
  if (Node.isPropertyAccessExpression(expression)) {
    return expression.getExpression()
  }
  return undefined
}

function extractTypeNameFromType(type: Type): string {
  const symbol = type.getSymbol() ?? type.getAliasSymbol()
  return symbol?.getName() ?? type.getText()
}

function resolveCallExpressionReturnType(callExpr: CallExpression): string | undefined {
  const expr = callExpr.getExpression()
  if (!Node.isPropertyAccessExpression(expr)) return undefined
  const methodName = expr.getName()
  const receiverType = expr.getExpression().getType()
  const receiverSymbol = receiverType.getSymbol()
  if (!receiverSymbol) return undefined

  for (const decl of receiverSymbol.getDeclarations()) {
    if (!Node.isClassDeclaration(decl)) continue
    const method = decl.getMethod(methodName)
    if (!method) continue
    const returnTypeNode = method.getReturnTypeNode()
    if (returnTypeNode) {
      return stripPromise(returnTypeNode.getText())
    }
  }
  return undefined
}

function resolveAwaitedCallReturnType(initializer: Node): string | undefined {
  if (!Node.isAwaitExpression(initializer)) return undefined
  const awaited = initializer.getExpression()
  if (!Node.isCallExpression(awaited)) return undefined
  return resolveCallExpressionReturnType(awaited)
}

function resolveFromVariableDeclaration(identifier: Node): string | undefined {
  if (!Node.isIdentifier(identifier)) return undefined
  const defs = identifier.getDefinitionNodes()
  const [firstDef] = defs
  if (!firstDef || !Node.isVariableDeclaration(firstDef)) return undefined

  const typeNode = firstDef.getTypeNode()
  if (typeNode) return typeNode.getText()

  const initializer = firstDef.getInitializer()
  if (initializer) return resolveAwaitedCallReturnType(initializer)

  return undefined
}

function resolveReceiverTypeName(receiver: Node): string {
  if (Node.isCallExpression(receiver)) {
    const returnType = resolveCallExpressionReturnType(receiver)
    if (returnType) return returnType
  }

  const type = receiver.getType()
  const rawName = extractTypeNameFromType(type)

  if (isUnresolvableType(rawName)) {
    const resolved = resolveFromVariableDeclaration(receiver)
    if (resolved) return resolved
  }

  return rawName
}

function buildError(
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

function handleUnresolvable(
  sourceFile: SourceFile,
  callExpression: CallExpression,
  rawTypeName: string,
  options: { strict: boolean },
): TypeResolution {
  const reason = `Receiver type is '${rawTypeName}' — no concrete type to resolve`
  if (options.strict) {
    throw buildError(sourceFile, callExpression, rawTypeName, reason)
  }
  return {
    resolved: false,
    reason,
  }
}

/** @riviere-role domain-service */
export function resolveCallExpressionReceiverType(
  callExpression: CallExpression,
  sourceFile: SourceFile,
  options: { strict: boolean },
): TypeResolution {
  const receiver = getReceiverExpression(callExpression)

  if (!receiver) {
    const reason = 'Call expression has no property access receiver'
    if (options.strict) {
      throw buildError(sourceFile, callExpression, 'unknown', reason)
    }
    return {
      resolved: false,
      reason,
    }
  }

  const rawTypeName = resolveReceiverTypeName(receiver)

  if (isUnresolvableType(rawTypeName)) {
    return handleUnresolvable(sourceFile, callExpression, rawTypeName, options)
  }

  return {
    resolved: true,
    typeName: stripGenerics(rawTypeName),
  }
}
