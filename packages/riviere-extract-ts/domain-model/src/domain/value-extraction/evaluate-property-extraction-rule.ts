import type { FromPropertyExtractionRule } from '@living-architecture/riviere-extract-config-published-language'
import type { ArrayLiteralExpression, ClassDeclaration, Expression } from 'ts-morph'
import { Node, SyntaxKind } from 'ts-morph'
import { ExtractionError } from './literal-detection'
import { ExtractionResult } from './extraction-result'

type PropertyInfo = {
  readonly initializer: ReturnType<import('ts-morph').PropertyDeclaration['getInitializer']>
  readonly filePath: string
  readonly line: number
}

function findPropertyInHierarchy(
  classDeclaration: ClassDeclaration,
  propertyName: string,
  propertyKind: 'static' | 'instance',
): PropertyInfo | undefined {
  const properties =
    propertyKind === 'static'
      ? classDeclaration.getStaticProperties()
      : classDeclaration.getInstanceProperties()
  const property = properties.find((candidate) => candidate.getName() === propertyName)
  if (property !== undefined && Node.isPropertyDeclaration(property)) {
    return {
      initializer: property.getInitializer(),
      filePath: classDeclaration.getSourceFile().getFilePath(),
      line: property.getStartLineNumber(),
    }
  }
  const baseClass = classDeclaration.getBaseClass()
  return baseClass === undefined
    ? undefined
    : findPropertyInHierarchy(baseClass, propertyName, propertyKind)
}

function extractStringArray(expression: ArrayLiteralExpression): string[] | undefined {
  const values: string[] = []
  for (const element of expression.getElements()) {
    if (element.getKind() !== SyntaxKind.StringLiteral) return undefined
    values.push(element.asKindOrThrow(SyntaxKind.StringLiteral).getLiteralValue())
  }
  return values
}

function extractPropertyLiteral(
  expression: Expression | undefined,
  filePath: string,
  line: number,
): ExtractionResult {
  if (expression === undefined) {
    throw new ExtractionError('No initializer found', filePath, line)
  }
  switch (expression.getKind()) {
    case SyntaxKind.StringLiteral:
      return ExtractionResult.parse({
        value: expression.asKindOrThrow(SyntaxKind.StringLiteral).getLiteralValue(),
      })
    case SyntaxKind.NumericLiteral:
      return ExtractionResult.parse({ value: Number(expression.getText()) })
    case SyntaxKind.TrueKeyword:
      return ExtractionResult.parse({ value: true })
    case SyntaxKind.FalseKeyword:
      return ExtractionResult.parse({ value: false })
    case SyntaxKind.ArrayLiteralExpression: {
      const values = extractStringArray(
        expression.asKindOrThrow(SyntaxKind.ArrayLiteralExpression),
      )
      if (values !== undefined) return ExtractionResult.parse({ value: values })
      break
    }
  }
  throw new ExtractionError(
    `Non-literal value detected (${expression.getKindName()}): ${expression.getText()}. Only inline literals (strings, numbers, booleans, string arrays) are supported`,
    filePath,
    line,
  )
}

/**
 * @riviere-role domain-service
 * @riviere-role-justification TODO: Added before justification rule introduced.
 */
export function evaluateFromPropertyRule(
  rule: FromPropertyExtractionRule,
  classDeclaration: ClassDeclaration,
): ExtractionResult {
  const propertyInfo = findPropertyInHierarchy(
    classDeclaration,
    rule.propertyName,
    rule.propertyKind,
  )
  if (propertyInfo === undefined) {
    throw new ExtractionError(
      `Property '${rule.propertyName}' not found on class '${classDeclaration.getName() ?? 'anonymous'}'`,
      classDeclaration.getSourceFile().getFilePath(),
      classDeclaration.getStartLineNumber(),
    )
  }
  const result = extractPropertyLiteral(
    propertyInfo.initializer,
    propertyInfo.filePath,
    propertyInfo.line,
  )
  const value = result.value
  if (rule.transform === undefined || typeof value !== 'string') return result
  return ExtractionResult.parse({
    value: rule.transform.applyTo(value),
  })
}
