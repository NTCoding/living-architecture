import {
  type CallExpression, type ClassDeclaration, Node 
} from 'ts-morph'

export function callerHasDecorator(
  callerClass: ClassDeclaration,
  decoratorNames: string[],
): boolean {
  const decorators = callerClass.getDecorators()
  return decorators.some((d) => decoratorNames.includes(d.getName()))
}

export function calleeHasDecorator(callExpression: CallExpression, decoratorName: string): boolean {
  const expression = callExpression.getExpression()
  if (!Node.isPropertyAccessExpression(expression)) return false
  const receiver = expression.getExpression()
  const type = receiver.getType()
  const symbol = type.getSymbol() ?? type.getAliasSymbol()
  if (!symbol) return false
  const declarations = symbol.getDeclarations()
  const classDecl = declarations.find((d) => Node.isClassDeclaration(d))
  if (!classDecl) return false
  const decorators = classDecl.getDecorators()
  return decorators.some((d) => d.getName() === decoratorName)
}
