import type {
  DecoratorArgumentSelector,
  ExtractionTransform,
  FromClassDecoratorArgExtractionRule,
  FromClassNameExtractionRule,
  FromDecoratorArgExtractionRule,
  FromDecoratorNameExtractionRule,
  FromFilePathExtractionRule,
  FromMethodNameExtractionRule,
  LiteralExtractionRule,
} from '@living-architecture/riviere-extract-config-published-language'
import { Node, SyntaxKind } from 'ts-morph'
import { ExtractionError } from './literal-detection'
import { ExtractionResult } from './extraction-result'

export {
  evaluateFromConstructorParamsRule,
  evaluateFromMethodSignatureRule,
  evaluateFromParameterTypeRule,
} from './evaluate-extraction-rule-method'

export { evaluateFromGenericArgRule } from './evaluate-extraction-rule-generic'

export { evaluateFromPropertyRule } from './evaluate-property-extraction-rule'

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

  return ExtractionResult.parse({ value: transform.applyTo(className) })
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

  return ExtractionResult.parse({ value: transform.applyTo(methodName) })
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

  return ExtractionResult.parse({ value: transform.applyTo(capturedValue) })
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
    value: transform === undefined ? value : transform.applyTo(value),
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

  return ExtractionResult.parse({ value: transform.applyTo(mappedValue) })
}
