import { Project } from 'ts-morph'
import { describe, expect, it } from 'vitest'
import { ConnectionDetectionError } from '../connection-detection-error'
import { CallableReference } from './callable-reference'
import { detectCallsInCallable } from './detect-calls-in-callable'

function createProject(content: string) {
  const project = new Project({ useInMemoryFileSystem: true })
  const sourceFile = project.createSourceFile('/src/calls.ts', content)
  return { project, sourceFile }
}

function functionReference(project: Project, name: string): CallableReference {
  const declaration = project.getSourceFileOrThrow('/src/calls.ts').getFunctionOrThrow(name)
  return CallableReference.parse({
    kind: 'function',
    filePath: declaration.getSourceFile().getFilePath(),
    lineNumber: declaration.getStartLineNumber(),
    callableName: name,
  })
}

function methodReference(
  project: Project,
  className: string,
  methodName: string,
): CallableReference {
  const declaration = project
    .getSourceFileOrThrow('/src/calls.ts')
    .getClassOrThrow(className)
    .getMethodOrThrow(methodName)
  return CallableReference.parse({
    kind: 'method',
    filePath: declaration.getSourceFile().getFilePath(),
    lineNumber: declaration.getStartLineNumber(),
    callableName: methodName,
    containerTypeName: className,
  })
}

describe('detectCallsInCallable', () => {
  it('returns no calls when the callable has no declaration', () => {
    const { project } = createProject('function present(): void {}')

    const missingFile = CallableReference.parse({
      kind: 'function',
      filePath: '/src/missing.ts',
      lineNumber: 1,
      callableName: 'missing',
    })
    const missingFunction = CallableReference.parse({
      kind: 'function',
      filePath: '/src/calls.ts',
      lineNumber: 99,
      callableName: 'missing',
    })
    const missingMethod = CallableReference.parse({
      kind: 'method',
      filePath: '/src/calls.ts',
      lineNumber: 99,
      callableName: 'missing',
    })
    const synthetic = CallableReference.parse({
      kind: 'synthetic',
      filePath: '/src/calls.ts',
      lineNumber: 1,
      callableName: 'synthetic',
    })

    expect(detectCallsInCallable(project, missingFile, false)).toStrictEqual([])
    expect(detectCallsInCallable(project, missingFunction, false)).toStrictEqual([])
    expect(detectCallsInCallable(project, missingMethod, false)).toStrictEqual([])
    expect(detectCallsInCallable(project, synthetic, false)).toStrictEqual([])
  })

  it('ignores calls without a receiver', () => {
    const { project } = createProject(`
      function helper(): void {}
      function run(): void { helper() }
    `)

    expect(detectCallsInCallable(project, functionReference(project, 'run'), false)).toStrictEqual(
      [],
    )
  })

  it('resolves chained and promised return types', () => {
    const { project } = createProject(`
      class Result { run(): void {} }
      class Factory {
        create(): Result { return new Result() }
        async load(): Promise<Result> { return new Result() }
      }
      function execute(factory: Factory): void {
        factory.create().run()
        factory.load().then()
      }
    `)

    const calls = detectCallsInCallable(project, functionReference(project, 'execute'), false)

    expect(calls).toStrictEqual(
      expect.arrayContaining([
        expect.objectContaining({ calledMethodName: 'run', receiverTypeName: 'Result' }),
        expect.objectContaining({ calledMethodName: 'then', receiverTypeName: 'Result' }),
      ]),
    )
  })

  it('uses variable declarations when inference leaves the receiver unresolved', () => {
    const { project } = createProject(`
      class Factory { async load(): Promise<any> { return {} } }
      async function execute(factory: Factory, pending: Promise<any>): Promise<void> {
        const typed: any = {}
        typed.run()
        let uninitialised: any
        uninitialised.run()
        const inferred = {} as any
        inferred.run()
        const loaded = await factory.load()
        loaded.run()
        const unresolved = await pending
        unresolved.run()
        ;({} as any).run()
      }
    `)

    const calls = detectCallsInCallable(project, functionReference(project, 'execute'), false)

    expect(calls.filter((call) => call.unresolvedReason !== undefined)).toHaveLength(6)
  })

  it('falls back to inferred call types when return declarations cannot resolve them', () => {
    const { project } = createProject(`
      class Result { run(): void {} }
      class InferredFactory { create() { return new Result() } }
      interface InterfaceFactory { create(): Result }
      function createResult(): Result { return new Result() }
      function execute(
        inferred: InferredFactory,
        fromInterface: InterfaceFactory,
        unknownFactory: any,
      ): void {
        inferred.create().run()
        fromInterface.create().run()
        createResult().run()
        unknownFactory.create().run()
      }
    `)

    const calls = detectCallsInCallable(project, functionReference(project, 'execute'), false)

    expect(calls.filter((call) => call.calledMethodName === 'run')).toHaveLength(4)
  })

  it('removes generic arguments from chained return types', () => {
    const { project } = createProject(`
      class Wrapper<T> { run(): void {} }
      class Factory { create(): Wrapper<string> { return new Wrapper<string>() } }
      function execute(factory: Factory): void { factory.create().run() }
    `)

    const calls = detectCallsInCallable(project, functionReference(project, 'execute'), false)

    expect(calls).toStrictEqual(
      expect.arrayContaining([
        expect.objectContaining({ calledMethodName: 'run', receiverTypeName: 'Wrapper' }),
      ]),
    )
  })

  it('throws in strict mode when a receiver has no concrete type', () => {
    const { project } = createProject(`
      class Caller {
        execute(dependency: any): void { dependency.run() }
      }
    `)

    expect(() =>
      detectCallsInCallable(project, methodReference(project, 'Caller', 'execute'), true),
    ).toThrow(ConnectionDetectionError)
  })
})
