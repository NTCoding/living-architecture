import { Project } from 'ts-morph'
import { describe, expect, it } from 'vitest'
import { ConnectionDetectionError } from '../connection-detection-error'
import { CallableReference } from './callable-reference'
import { DetectedCall } from './detected-call'

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

describe('DetectedCall.fromCallable', () => {
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

    expect(DetectedCall.fromCallable(missingFile, project, false)).toStrictEqual([])
    expect(DetectedCall.fromCallable(missingFunction, project, false)).toStrictEqual([])
    expect(DetectedCall.fromCallable(missingMethod, project, false)).toStrictEqual([])
    expect(DetectedCall.fromCallable(synthetic, project, false)).toStrictEqual([])
  })

  it('ignores calls without a receiver', () => {
    const { project } = createProject(`
      function helper(): void {}
      function run(): void { helper() }
    `)

    expect(
      DetectedCall.fromCallable(functionReference(project, 'run'), project, false),
    ).toStrictEqual([])
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

    const calls = DetectedCall.fromCallable(functionReference(project, 'execute'), project, false)

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
        const unavailable: any = undefined
        unavailable.run()
        const inferred = JSON.parse('{}')
        inferred.run()
        const loaded = await factory.load()
        loaded.run()
        const unresolved = await pending
        unresolved.run()
        JSON.parse('{}').run()
      }
    `)

    const calls = DetectedCall.fromCallable(functionReference(project, 'execute'), project, false)

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

    const calls = DetectedCall.fromCallable(functionReference(project, 'execute'), project, false)

    expect(calls.filter((call) => call.calledMethodName === 'run')).toHaveLength(4)
  })

  it('removes generic arguments from chained return types', () => {
    const { project } = createProject(`
      class Wrapper<T> { run(): void {} }
      class Factory { create(): Wrapper<string> { return new Wrapper<string>() } }
      function execute(factory: Factory): void { factory.create().run() }
    `)

    const calls = DetectedCall.fromCallable(functionReference(project, 'execute'), project, false)

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
      DetectedCall.fromCallable(methodReference(project, 'Caller', 'execute'), project, true),
    ).toThrow(ConnectionDetectionError)
  })
})
