import {
  Project, CallExpression, SyntaxKind 
} from 'ts-morph'

export class CallExpressionNotFoundError extends Error {
  constructor(scope: string, method: string) {
    super(`No call expression found in ${scope}.${method}`)
    this.name = 'CallExpressionNotFoundError'
  }
}

export const sharedProject = new Project({
  useInMemoryFileSystem: true,
  compilerOptions: {
    strict: true,
    target: 99,
    module: 99,
  },
})
const counter = { value: 0 }

export function nextFile(content: string): string {
  counter.value++
  const filePath = `/src/test-type-resolver-${counter.value}.ts`
  sharedProject.createSourceFile(filePath, content)
  return filePath
}

export function getFirstCallExpression(
  filePath: string,
  className: string,
  methodName: string,
): CallExpression {
  const sourceFile = sharedProject.getSourceFileOrThrow(filePath)
  const classDecl = sourceFile.getClassOrThrow(className)
  const method = classDecl.getMethodOrThrow(methodName)
  const callExprs = method.getDescendantsOfKind(SyntaxKind.CallExpression)
  const [first] = callExprs
  if (!first) throw new CallExpressionNotFoundError(className, methodName)
  return first
}

export function getCallExpressionFromFunction(
  filePath: string,
  functionName: string,
): CallExpression {
  const sourceFile = sharedProject.getSourceFileOrThrow(filePath)
  const funcDecl = sourceFile.getFunctionOrThrow(functionName)
  const callExprs = funcDecl.getDescendantsOfKind(SyntaxKind.CallExpression)
  const [first] = callExprs
  if (!first) throw new CallExpressionNotFoundError('function', functionName)
  return first
}

export function getCallExpressionByText(
  filePath: string,
  className: string,
  methodName: string,
  text: string,
): CallExpression {
  const sourceFile = sharedProject.getSourceFileOrThrow(filePath)
  const classDecl = sourceFile.getClassOrThrow(className)
  const method = classDecl.getMethodOrThrow(methodName)
  const callExprs = method.getDescendantsOfKind(SyntaxKind.CallExpression)
  const match = callExprs.find((c) => c.getText().includes(text))
  if (!match) throw new CallExpressionNotFoundError(className, methodName)
  return match
}
