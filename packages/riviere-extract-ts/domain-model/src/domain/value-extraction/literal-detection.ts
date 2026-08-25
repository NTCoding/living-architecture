import type { Expression } from 'ts-morph'
import { SyntaxKind } from 'ts-morph'

/** @riviere-role domain-error */
export class ExtractionError extends Error {
  readonly location: {
    file: string
    line: number
  }

  constructor(message: string, file: string, line: number) {
    super(`${message} at ${file}:${line}`)
    this.name = 'ExtractionError'
    this.location = {
      file,
      line,
    }
  }
}

/** @riviere-role domain-error */
export class TestFixtureError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TestFixtureError'
  }
}

type LiteralKind = 'string' | 'number' | 'boolean' | 'string[]'
type LiteralValue = string | number | boolean | string[]

/**
 * @riviere-role domain-service
 * @riviere-role-justification TODO: Added before justification rule introduced.
 */
export function isLiteralValue(expression: Expression | undefined): boolean {
  if (expression === undefined) {
    return false
  }

  const kind = expression.getKind()
  return (
    kind === SyntaxKind.StringLiteral ||
    kind === SyntaxKind.NumericLiteral ||
    kind === SyntaxKind.TrueKeyword ||
    kind === SyntaxKind.FalseKeyword ||
    isStringArrayLiteral(expression)
  )
}

function isStringArrayLiteral(expression: Expression): boolean {
  if (expression.getKind() !== SyntaxKind.ArrayLiteralExpression) {
    return false
  }
  const elements = expression.asKindOrThrow(SyntaxKind.ArrayLiteralExpression).getElements()
  return elements.every((e) => e.getKind() === SyntaxKind.StringLiteral)
}

/** @riviere-role value-object */
export class LiteralResult {
  declare private brand: 'LiteralResult'
  readonly kind: LiteralKind
  readonly value: LiteralValue

  static parse(params: { kind: LiteralKind; value: LiteralValue }): LiteralResult {
    return new LiteralResult(params)
  }

  private constructor(params: { kind: LiteralKind; value: LiteralValue }) {
    this.kind = params.kind
    this.value = params.value
  }
}

function extractString(expression: Expression): string {
  return expression.asKindOrThrow(SyntaxKind.StringLiteral).getLiteralValue()
}

function extractNumber(expression: Expression): number {
  return Number(expression.getText())
}

function extractStringArray(expression: Expression): string[] | undefined {
  const arrayLiteral = expression.asKindOrThrow(SyntaxKind.ArrayLiteralExpression)
  const elements = arrayLiteral.getElements()
  const values: string[] = []
  for (const element of elements) {
    if (element.getKind() !== SyntaxKind.StringLiteral) {
      return undefined
    }
    values.push(element.asKindOrThrow(SyntaxKind.StringLiteral).getLiteralValue())
  }
  return values
}

function buildExtractionResult(expression: Expression): LiteralResult | undefined {
  const syntaxKind = expression.getKind()

  switch (syntaxKind) {
    case SyntaxKind.StringLiteral:
      return LiteralResult.parse({
        kind: 'string',
        value: extractString(expression),
      })
    case SyntaxKind.NumericLiteral:
      return LiteralResult.parse({
        kind: 'number',
        value: extractNumber(expression),
      })
    case SyntaxKind.TrueKeyword:
      return LiteralResult.parse({
        kind: 'boolean',
        value: true,
      })
    case SyntaxKind.FalseKeyword:
      return LiteralResult.parse({
        kind: 'boolean',
        value: false,
      })
    case SyntaxKind.ArrayLiteralExpression: {
      const values = extractStringArray(expression)
      if (values === undefined) {
        return undefined
      }
      return LiteralResult.parse({
        kind: 'string[]',
        value: values,
      })
    }
    default:
      return undefined
  }
}

function throwMissingInitializer(file: string, line: number): never {
  throw new ExtractionError('No initializer found', file, line)
}

function throwNonLiteralValue(expression: Expression, file: string, line: number): never {
  throw new ExtractionError(
    `Non-literal value detected (${expression.getKindName()}): ${expression.getText()}. Only inline literals (strings, numbers, booleans, string arrays) are supported`,
    file,
    line,
  )
}

/**
 * @riviere-role domain-service
 * @riviere-role-justification TODO: Added before justification rule introduced.
 */
export function extractLiteralValue(
  expression: Expression | undefined,
  file: string,
  line: number,
): LiteralResult {
  if (expression === undefined) {
    throwMissingInitializer(file, line)
  }

  const result = buildExtractionResult(expression)
  if (result === undefined) {
    throwNonLiteralValue(expression, file, line)
  }

  return result
}
