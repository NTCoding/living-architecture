import type { Expression } from 'ts-morph'
import { SyntaxKind } from 'ts-morph'

/** Error thrown when extraction fails due to invalid input or unsupported value type. */
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

/** Internal error thrown when test fixture setup fails. */
export class TestFixtureError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TestFixtureError'
  }
}

/**
 * Checks if an AST expression is an extractable literal value.
 * Only string, number, and boolean literals are extractable.
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
    kind === SyntaxKind.FalseKeyword
  )
}

export type LiteralResult =
  | {
    kind: 'string'
    value: string
  }
  | {
    kind: 'number'
    value: number
  }
  | {
    kind: 'boolean'
    value: boolean
  }

function extractString(expression: Expression): string {
  const text = expression.getText()
  return text.slice(1, -1)
}

function extractNumber(expression: Expression): number {
  return Number(expression.getText())
}

function buildExtractionResult(expression: Expression): LiteralResult | undefined {
  const syntaxKind = expression.getKind()

  switch (syntaxKind) {
    case SyntaxKind.StringLiteral:
      return {
        kind: 'string',
        value: extractString(expression),
      }
    case SyntaxKind.NumericLiteral:
      return {
        kind: 'number',
        value: extractNumber(expression),
      }
    case SyntaxKind.TrueKeyword:
      return {
        kind: 'boolean',
        value: true,
      }
    case SyntaxKind.FalseKeyword:
      return {
        kind: 'boolean',
        value: false,
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
    `Non-literal value detected (${expression.getKindName()}): ${expression.getText()}. Only inline literals (strings, numbers, booleans) are supported`,
    file,
    line,
  )
}

/**
 * Extracts a literal value from an AST expression.
 * Returns a discriminated union to satisfy sonarjs/function-return-type.
 * @throws ExtractionError if the expression is not a literal.
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
