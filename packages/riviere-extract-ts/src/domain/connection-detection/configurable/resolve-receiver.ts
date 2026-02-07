import {
  type CallExpression, Node 
} from 'ts-morph'

export const UNRESOLVABLE_TYPES = new Set([
  'any',
  'unknown',
  'object',
  'string',
  'number',
  'boolean',
  'symbol',
  'bigint',
  'void',
  'undefined',
  'null',
  'never',
])

export interface ReceiverResolution {
  calledMethod: string
  receiverTypeName: string | undefined
}

export function resolveCallReceiver(
  callExpression: CallExpression,
): ReceiverResolution | undefined {
  const expression = callExpression.getExpression()
  if (!Node.isPropertyAccessExpression(expression)) return undefined
  const calledMethod = expression.getName()
  const receiver = expression.getExpression()
  const type = receiver.getType()
  const symbol = type.getSymbol() ?? type.getAliasSymbol()
  const typeName = symbol?.getName() ?? type.getText()
  const receiverTypeName = UNRESOLVABLE_TYPES.has(typeName) ? undefined : typeName
  return {
    calledMethod,
    receiverTypeName,
  }
}
