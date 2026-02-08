import type { CallExpression } from 'ts-morph'
import type {
  ConnectionExtractionRule,
  ConnectionExtractBlock,
} from '@living-architecture/riviere-extract-config'
import {
  resolveCallReceiver, UNRESOLVABLE_TYPES 
} from './resolve-receiver'

function resolveArgumentTypeName(
  callExpression: CallExpression,
  index: number,
): string | undefined {
  const args = callExpression.getArguments()
  const arg = args[index]
  if (!arg) return undefined
  const type = arg.getType()
  const symbol = type.getSymbol() ?? type.getAliasSymbol()
  const typeName = symbol?.getName() ?? type.getText()
  if (UNRESOLVABLE_TYPES.has(typeName)) return undefined
  return typeName
}

function evaluateRule(
  rule: ConnectionExtractionRule,
  callExpression: CallExpression,
  callerClassName: string,
): string | undefined {
  if ('fromReceiverType' in rule) {
    return resolveCallReceiver(callExpression)?.receiverTypeName
  }
  if ('fromCallerType' in rule) {
    return callerClassName
  }
  return resolveArgumentTypeName(callExpression, rule.fromArgument)
}

export function evaluateExtractRules(
  extract: ConnectionExtractBlock,
  callExpression: CallExpression,
  callerClassName: string,
): Record<string, string | undefined> {
  const result: Record<string, string | undefined> = {}
  for (const [fieldName, rule] of Object.entries(extract)) {
    result[fieldName] = evaluateRule(rule, callExpression, callerClassName)
  }
  return result
}
