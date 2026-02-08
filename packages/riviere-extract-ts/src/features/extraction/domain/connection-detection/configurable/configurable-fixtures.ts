import {
  Project, SyntaxKind, ScriptTarget, ModuleKind, type CallExpression 
} from 'ts-morph'

class CallExpressionNotFoundError extends Error {
  /* c8 ignore start */
  constructor(className: string, methodName: string) {
    super(`CallExpression not found in ${className}.${methodName}`)
    this.name = 'CallExpressionNotFoundError'
    Error.captureStackTrace?.(this, this.constructor)
  }
  /* c8 ignore stop */
}

const state = { counter: 0 }

export function createTestProject(options?: { experimentalDecorators?: boolean }): Project {
  const compilerOptions: {
    strict: boolean
    target: ScriptTarget
    module: ModuleKind
    experimentalDecorators?: boolean
  } = {
    strict: true,
    target: ScriptTarget.ESNext,
    module: ModuleKind.ESNext,
  }
  if (options?.experimentalDecorators !== undefined) {
    compilerOptions.experimentalDecorators = options.experimentalDecorators
  }
  return new Project({
    useInMemoryFileSystem: true,
    compilerOptions,
  })
}

export function createTestFile(project: Project, content: string): string {
  state.counter++
  const filePath = `/src/test-file-${state.counter}.ts`
  project.createSourceFile(filePath, content)
  return filePath
}

export function getFirstCallExpression(
  project: Project,
  filePath: string,
  className: string,
  methodName: string,
): CallExpression {
  const sourceFile = project.getSourceFileOrThrow(filePath)
  const classDecl = sourceFile.getClassOrThrow(className)
  const method = classDecl.getMethodOrThrow(methodName)
  const callExprs = method.getDescendantsOfKind(SyntaxKind.CallExpression)
  const [first] = callExprs
  if (!first) throw new CallExpressionNotFoundError(className, methodName)
  return first
}
