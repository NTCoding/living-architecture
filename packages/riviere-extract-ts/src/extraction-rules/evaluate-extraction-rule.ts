import type {
  LiteralExtractionRule,
  FromClassNameExtractionRule,
  FromMethodNameExtractionRule,
  FromFilePathExtractionRule,
  FromPropertyExtractionRule,
  FromDecoratorArgExtractionRule,
  FromDecoratorNameExtractionRule,
} from '@living-architecture/riviere-extract-config'

export {
  evaluateFromMethodSignatureRule,
  evaluateFromConstructorParamsRule,
  evaluateFromParameterTypeRule,
  type ParameterInfo,
  type MethodSignature,
} from './evaluate-extraction-rule-method'

export { evaluateFromGenericArgRule } from './evaluate-extraction-rule-generic'
import type {
  ClassDeclaration, MethodDeclaration, Decorator 
} from 'ts-morph'
import { SyntaxKind } from 'ts-morph'
import { applyTransforms } from './transforms'
import {
  ExtractionError, extractLiteralValue 
} from './literal-detection'

export type ExtractionContext = { filePath: string }

type ExtractionValue = string | number | boolean | string[]

export type ExtractionResult = { value: ExtractionValue }

function literal(value: string | number | boolean): ExtractionResult {
  return { value }
}

export function evaluateLiteralRule(rule: LiteralExtractionRule): ExtractionResult {
  return literal(rule.literal)
}

export function evaluateFromClassNameRule(
  rule: FromClassNameExtractionRule,
  classDecl: ClassDeclaration,
): ExtractionResult {
  const className = classDecl.getName() ?? ''

  if (rule.fromClassName === true) {
    return { value: className }
  }

  const transform = rule.fromClassName.transform
  if (transform === undefined) {
    return { value: className }
  }

  return { value: applyTransforms(className, transform) }
}

export function evaluateFromMethodNameRule(
  rule: FromMethodNameExtractionRule,
  methodDecl: MethodDeclaration,
): ExtractionResult {
  const methodName = methodDecl.getName()

  if (rule.fromMethodName === true) {
    return { value: methodName }
  }

  const transform = rule.fromMethodName.transform
  if (transform === undefined) {
    return { value: methodName }
  }

  return { value: applyTransforms(methodName, transform) }
}

export function evaluateFromFilePathRule(
  rule: FromFilePathExtractionRule,
  filePath: string,
): ExtractionResult {
  const {
    pattern, capture, transform 
  } = rule.fromFilePath
  const regex = new RegExp(pattern)
  const match = regex.exec(filePath)

  if (match === null) {
    throw new ExtractionError(
      `Pattern '${pattern}' did not match file path '${filePath}'`,
      filePath,
      0,
    )
  }

  const capturedValue = match[capture]
  if (capturedValue === undefined) {
    throw new ExtractionError(
      `Capture group ${capture} out of bounds. Pattern has ${match.length - 1} capture groups`,
      filePath,
      0,
    )
  }

  if (transform === undefined) {
    return { value: capturedValue }
  }

  return { value: applyTransforms(capturedValue, transform) }
}

type PropertyInfo = {
  initializer: ReturnType<import('ts-morph').PropertyDeclaration['getInitializer']>
  filePath: string
  line: number
}

function findPropertyInHierarchy(
  classDecl: ClassDeclaration,
  propertyName: string,
  isStatic: boolean,
): PropertyInfo | undefined {
  const properties = isStatic ? classDecl.getStaticProperties() : classDecl.getInstanceProperties()

  const property = properties.find((p) => p.getName() === propertyName)

  if (property !== undefined && 'getInitializer' in property) {
    const sourceFile = classDecl.getSourceFile()
    return {
      initializer: property.getInitializer(),
      filePath: sourceFile.getFilePath(),
      line: property.getStartLineNumber(),
    }
  }

  const baseClass = classDecl.getBaseClass()
  if (baseClass === undefined) {
    return undefined
  }

  return findPropertyInHierarchy(baseClass, propertyName, isStatic)
}

export function evaluateFromPropertyRule(
  rule: FromPropertyExtractionRule,
  classDecl: ClassDeclaration,
): ExtractionResult {
  const {
    name, kind, transform 
  } = rule.fromProperty
  const isStatic = kind === 'static'

  const propertyInfo = findPropertyInHierarchy(classDecl, name, isStatic)

  if (propertyInfo === undefined) {
    const sourceFile = classDecl.getSourceFile()
    throw new ExtractionError(
      `Property '${name}' not found on class '${classDecl.getName() ?? 'anonymous'}'`,
      sourceFile.getFilePath(),
      classDecl.getStartLineNumber(),
    )
  }

  const literalResult = extractLiteralValue(
    propertyInfo.initializer,
    propertyInfo.filePath,
    propertyInfo.line,
  )

  if (transform === undefined) {
    return { value: literalResult.value }
  }

  if (typeof literalResult.value !== 'string') {
    return { value: literalResult.value }
  }

  return { value: applyTransforms(literalResult.value, transform) }
}

type DecoratorLocation = {
  filePath: string
  line: number
}

function getDecoratorLocation(decorator: Decorator): DecoratorLocation {
  const sourceFile = decorator.getSourceFile()
  return {
    filePath: sourceFile.getFilePath(),
    line: decorator.getStartLineNumber(),
  }
}

function extractPositionalArg(decorator: Decorator, position: number): string {
  const args = decorator.getArguments()
  const location = getDecoratorLocation(decorator)

  if (args.length === 0) {
    throw new ExtractionError(
      `Decorator '@${decorator.getName()}' has no arguments`,
      location.filePath,
      location.line,
    )
  }

  const arg = args[position]
  if (arg === undefined) {
    throw new ExtractionError(
      `Argument position ${position} out of bounds. Decorator has ${args.length} argument(s)`,
      location.filePath,
      location.line,
    )
  }

  if (arg.getKind() !== SyntaxKind.StringLiteral) {
    throw new ExtractionError(
      `Expected string literal at position ${position}, got ${arg.getKindName()}`,
      location.filePath,
      location.line,
    )
  }

  const text = arg.getText()
  return text.slice(1, -1)
}

function throwNoArguments(decorator: Decorator, location: DecoratorLocation): never {
  throw new ExtractionError(
    `Decorator '@${decorator.getName()}' has no arguments`,
    location.filePath,
    location.line,
  )
}

function getFirstArgument(
  decorator: Decorator,
  location: DecoratorLocation,
): import('ts-morph').Node {
  const args = decorator.getArguments()
  const firstArg = args[0]
  if (firstArg === undefined) {
    throwNoArguments(decorator, location)
  }
  return firstArg
}

function extractNamedArg(decorator: Decorator, name: string): string {
  const location = getDecoratorLocation(decorator)
  const firstArg = getFirstArgument(decorator, location)

  if (firstArg.getKind() !== SyntaxKind.ObjectLiteralExpression) {
    throw new ExtractionError(
      `Expected object literal argument, got ${firstArg.getKindName()}`,
      location.filePath,
      location.line,
    )
  }

  const objectLiteral = firstArg.asKindOrThrow(SyntaxKind.ObjectLiteralExpression)
  const property = objectLiteral.getProperty(name)

  if (property === undefined) {
    throw new ExtractionError(
      `Property '${name}' not found in decorator argument`,
      location.filePath,
      location.line,
    )
  }

  if (!('getInitializer' in property)) {
    throw new ExtractionError(
      `Property '${name}' has no initializer`,
      location.filePath,
      location.line,
    )
  }

  const initializer = property.getInitializer()
  if (initializer?.getKind() !== SyntaxKind.StringLiteral) {
    throw new ExtractionError(
      `Expected string literal for property '${name}'`,
      location.filePath,
      location.line,
    )
  }

  const text = initializer.getText()
  return text.slice(1, -1)
}

export function evaluateFromDecoratorArgRule(
  rule: FromDecoratorArgExtractionRule,
  decorator: Decorator,
): ExtractionResult {
  const {
    position, name, transform 
  } = rule.fromDecoratorArg

  const value =
    position === undefined
      ? extractNamedArg(decorator, name ?? '')
      : extractPositionalArg(decorator, position)

  if (transform === undefined) {
    return { value }
  }

  return { value: applyTransforms(value, transform) }
}

export function evaluateFromDecoratorNameRule(
  rule: FromDecoratorNameExtractionRule,
  decorator: Decorator,
): ExtractionResult {
  const decoratorName = decorator.getName()

  if (rule.fromDecoratorName === true) {
    return { value: decoratorName }
  }

  const {
    mapping, transform 
  } = rule.fromDecoratorName

  const mappedValue = mapping?.[decoratorName] ?? decoratorName

  if (transform === undefined) {
    return { value: mappedValue }
  }

  return { value: applyTransforms(mappedValue, transform) }
}
