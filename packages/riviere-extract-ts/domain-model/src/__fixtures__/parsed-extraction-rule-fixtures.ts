import {
  FromClassDecoratorArgExtractionRule,
  FromClassNameExtractionRule,
  FromConstructorParamsExtractionRule,
  FromDecoratorArgExtractionRule,
  FromDecoratorNameExtractionRule,
  FromFilePathExtractionRule,
  FromGenericArgExtractionRule,
  FromMethodNameExtractionRule,
  FromMethodSignatureExtractionRule,
  FromParameterTypeExtractionRule,
  FromPropertyExtractionRule,
  LiteralExtractionRule,
} from '@living-architecture/riviere-extract-config-published-language'
import { TestFixtureError } from '../domain/value-extraction/literal-detection'

function requireParsedRule<T>(
  result:
    | { readonly success: true; readonly data: T }
    | { readonly success: false; readonly errors: readonly string[] },
): T {
  if (!result.success) throw new TestFixtureError(result.errors.join('\n'))
  return result.data
}

export function literalRule(input: unknown): LiteralExtractionRule {
  return requireParsedRule(LiteralExtractionRule.parse(input))
}

export function classNameRule(input: unknown): FromClassNameExtractionRule {
  return requireParsedRule(FromClassNameExtractionRule.parse(input))
}

export function methodNameRule(input: unknown): FromMethodNameExtractionRule {
  return requireParsedRule(FromMethodNameExtractionRule.parse(input))
}

export function filePathRule(input: unknown): FromFilePathExtractionRule {
  return requireParsedRule(FromFilePathExtractionRule.parse(input))
}

export function propertyRule(input: unknown): FromPropertyExtractionRule {
  return requireParsedRule(FromPropertyExtractionRule.parse(input))
}

export function decoratorArgumentRule(input: unknown): FromDecoratorArgExtractionRule {
  return requireParsedRule(FromDecoratorArgExtractionRule.parse(input))
}

export function classDecoratorArgumentRule(input: unknown): FromClassDecoratorArgExtractionRule {
  return requireParsedRule(FromClassDecoratorArgExtractionRule.parse(input))
}

export function decoratorNameRule(input: unknown): FromDecoratorNameExtractionRule {
  return requireParsedRule(FromDecoratorNameExtractionRule.parse(input))
}

export function genericArgumentRule(input: unknown): FromGenericArgExtractionRule {
  return requireParsedRule(FromGenericArgExtractionRule.parse(input))
}

export function methodSignatureRule(input: unknown): FromMethodSignatureExtractionRule {
  return requireParsedRule(FromMethodSignatureExtractionRule.parse(input))
}

export function constructorParametersRule(input: unknown): FromConstructorParamsExtractionRule {
  return requireParsedRule(FromConstructorParamsExtractionRule.parse(input))
}

export function parameterTypeRule(input: unknown): FromParameterTypeExtractionRule {
  return requireParsedRule(FromParameterTypeExtractionRule.parse(input))
}
