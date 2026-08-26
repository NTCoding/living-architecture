import type {
  DecoratorArgumentSelector,
  ExtractionTransform,
  FromClassDecoratorArgExtractionRule,
  FromClassNameExtractionRule,
  FromDecoratorArgExtractionRule,
  FromDecoratorNameExtractionRule,
  FromFilePathExtractionRule,
  FromMethodNameExtractionRule,
  FromPropertyExtractionRule,
  LiteralExtractionRule,
} from '@living-architecture/riviere-extract-config-published-language'
import { Node, SyntaxKind } from 'ts-morph'
import { ExtractionError, extractLiteralValue } from './literal-detection'
import { applyTransforms } from './transforms'
import { ExtractionResult } from './extraction-result'

export {
  evaluateFromConstructorParamsRule,
  evaluateFromMethodSignatureRule,
  evaluateFromParameterTypeRule,
} from './evaluate-extraction-rule-method'

export { evaluateFromGenericArgRule } from './evaluate-extraction-rule-generic'

type ClassDeclaration = import('ts-morph').ClassDeclaration
type MethodDeclaration = import('ts-morph').MethodDeclaration
type Decorator = import('ts-morph').Decorator

function literal(value: string | number | boolean): ExtractionResult {
  return ExtractionResult.parse({ value })
}

/**
 * @riviere-role domain-service
 * @riviere-role-justification TODO: Added before justification rule introduced.
 */
export function evaluateLiteralRule(rule: LiteralExtractionRule): ExtractionResult {
  return literal(rule.value)
}

/**
 * @riviere-role domain-service
 * @riviere-role-justification TODO: Added before justification rule introduced.
 */
export function evaluateFromClassNameRule(
  rule: FromClassNameExtractionRule,
  classDecl: ClassDeclaration,
): ExtractionResult {
  const className = classDecl.getName()
  if (!className) {
    const filePath = classDecl.getSourceFile().getFilePath()
    const lineNumber = classDecl.getStartLineNumber()
    throw new ExtractionError('Expected class name, got undefined', filePath, lineNumber)
  }

  const transform = rule.transform
  if (transform === undefined) {
    return ExtractionResult.parse({ value: className })
  }

  return ExtractionResult.parse({ value: applyTransforms(className, transform) })
}

/**
 * @riviere-role domain-service
 * @riviere-role-justification TODO: Added before justification rule introduced.
 */
export function evaluateFromMethodNameRule(
  rule: FromMethodNameExtractionRule,
  methodDecl: MethodDeclaration,
): ExtractionResult {
  const methodName = methodDecl.getName()

  const transform = rule.transform
  if (transform === undefined) {
    return ExtractionResult.parse({ value: methodName })
  }

  return ExtractionResult.parse({ value: applyTransforms(methodName, transform) })
}

/**
 * @riviere-role domain-service
 * @riviere-role-justification TODO: Added before justification rule introduced.
 */
export function evaluateFromFilePathRule(
  rule: FromFilePathExtractionRule,
  filePath: string,
): ExtractionResult {
  const pattern = rule.pattern
  const capture = rule.capture
  const transform = rule.transform
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
    return ExtractionResult.parse({ value: capturedValue })
  }

  return ExtractionResult.parse({ value: applyTransforms(capturedValue, transform) })
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

  if (property !== undefined && Node.isPropertyDeclaration(property)) {
    const sourceFile = classDecl.getSourceFile()
    return {
      initializer: property.getInitializer(),
      filePath: sourceFile.getFilePath(),
      line: property.getStartLineNumber(),
    }
  }

  if (classDecl.getExtends() === undefined) {
    return undefined
  }

  const baseClass = classDecl.getBaseClass()
  /* v8 ignore next -- @preserve: getExtends() !== undefined guarantees getBaseClass() returns a value */
  if (baseClass === undefined) return undefined

  return findPropertyInHierarchy(baseClass, propertyName, isStatic)
}

/**
 * @riviere-role domain-service
 * @riviere-role-justification TODO: Added before justification rule introduced.
 */
export function evaluateFromPropertyRule(
  rule: FromPropertyExtractionRule,
  classDecl: ClassDeclaration,
): ExtractionResult {
  const name = rule.propertyName
  const kind = rule.propertyKind
  const transform = rule.transform
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
    return ExtractionResult.parse({ value: literalResult.value })
  }

  if (typeof literalResult.value !== 'string') {
    return ExtractionResult.parse({ value: literalResult.value })
  }

  return ExtractionResult.parse({ value: applyTransforms(literalResult.value, transform) })
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

  return arg.asKindOrThrow(SyntaxKind.StringLiteral).getLiteralValue()
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

  if (!Node.isPropertyAssignment(property)) {
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

  return initializer.asKindOrThrow(SyntaxKind.StringLiteral).getLiteralValue()
}

/**
 * @riviere-role domain-service
 * @riviere-role-justification TODO: Added before justification rule introduced.
 */
export function evaluateFromDecoratorArgRule(
  rule: FromDecoratorArgExtractionRule,
  decorator: Decorator,
): ExtractionResult {
  if (rule.decoratorName !== undefined && decorator.getName() !== rule.decoratorName) {
    const location = getDecoratorLocation(decorator)
    throw new ExtractionError(
      `Expected decorator '@${rule.decoratorName}', got '@${decorator.getName()}'`,
      location.filePath,
      location.line,
    )
  }
  return evaluateDecoratorArgument(decorator, rule.argument, rule.transform)
}

function evaluateDecoratorArgument(
  decorator: Decorator,
  argument: DecoratorArgumentSelector,
  transform: ExtractionTransform | undefined,
): ExtractionResult {
  const value =
    argument.kind === 'position'
      ? extractPositionalArg(decorator, argument.position)
      : extractNamedArg(decorator, argument.name)
  return ExtractionResult.parse({
    value: transform === undefined ? value : applyTransforms(value, transform),
  })
}

/**
 * @riviere-role domain-service
 * @riviere-role-justification TODO: Added before justification rule introduced.
 */
export function evaluateFromClassDecoratorArgRule(
  rule: FromClassDecoratorArgExtractionRule,
  methodDecl: MethodDeclaration,
): ExtractionResult {
  const classDecl = methodDecl.getParentIfKind(SyntaxKind.ClassDeclaration)
  if (classDecl === undefined) {
    const sourceFile = methodDecl.getSourceFile()
    throw new ExtractionError(
      `Expected method '${methodDecl.getName()}' to be declared inside a class`,
      sourceFile.getFilePath(),
      methodDecl.getStartLineNumber(),
    )
  }

  const classDecorator = classDecl
    .getDecorators()
    .find((decorator) => decorator.getName() === rule.decoratorName)

  if (classDecorator === undefined) {
    const sourceFile = classDecl.getSourceFile()
    throw new ExtractionError(
      `Decorator '@${rule.decoratorName}' not found on containing class '${classDecl.getName() ?? 'anonymous'}'`,
      sourceFile.getFilePath(),
      classDecl.getStartLineNumber(),
    )
  }

  return evaluateDecoratorArgument(classDecorator, rule.argument, rule.transform)
}

/**
 * @riviere-role domain-service
 * @riviere-role-justification TODO: Added before justification rule introduced.
 */
export function evaluateFromDecoratorNameRule(
  rule: FromDecoratorNameExtractionRule,
  decorator: Decorator,
): ExtractionResult {
  const decoratorName = decorator.getName()

  const mapping = rule.mapping
  const transform = rule.transform

  const mappedValue = mapping?.[decoratorName] ?? decoratorName

  if (transform === undefined) {
    return ExtractionResult.parse({ value: mappedValue })
  }

  return ExtractionResult.parse({ value: applyTransforms(mappedValue, transform) })
}
