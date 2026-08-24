import { Project } from 'ts-morph'
import { describe, expect, it } from 'vitest'
import { EnrichedComponent } from '../../value-extraction/enriched-component'
import { ComponentIndex } from '../component-index'
import { ConnectionDetectionError } from '../connection-detection-error'
import { CallSite } from './call-graph-types'
import { CallableReference } from './callable-reference'
import { DetectedCall } from './detected-call'
import { resolveCallTargets } from './resolve-call-targets'

function component(name: string, file: string, line: number): EnrichedComponent {
  return EnrichedComponent.parse({
    type: 'useCase',
    name,
    location: { file, line },
    domain: 'orders',
    module: 'orders',
    metadata: {},
    _missing: undefined,
  })
}

function detectedCall(receiverTypeName?: string, calledMethodName = 'run'): DetectedCall {
  const source = CallableReference.parse({
    kind: 'function',
    filePath: '/src/caller.ts',
    lineNumber: 1,
    callableName: 'execute',
  })
  return DetectedCall.parse({
    source,
    ...(receiverTypeName === undefined ? {} : { receiverTypeName }),
    calledMethodName,
    callSite: CallSite.parse({
      filePath: '/src/caller.ts',
      lineNumber: 1,
      methodName: 'execute',
    }),
  })
}

describe('resolveCallTargets', () => {
  it('uses a default reason when the receiver type is absent', () => {
    const project = new Project({ useInMemoryFileSystem: true })

    const [result] = resolveCallTargets({
      calls: [detectedCall()],
      project,
      sourceFilePaths: [],
      componentIndex: ComponentIndex.parse([]),
      strict: false,
    })

    expect(result).toMatchObject({ kind: 'unresolved', reason: 'Receiver type unresolved' })
  })

  it('creates a synthetic callable when a component method is not in the project', () => {
    const target = component('Target', '/src/target.ts', 4)
    const project = new Project({ useInMemoryFileSystem: true })

    const [result] = resolveCallTargets({
      calls: [detectedCall('Target')],
      project,
      sourceFilePaths: [],
      componentIndex: ComponentIndex.parse([target]),
      strict: false,
    })

    expect(result).toMatchObject({
      kind: 'component',
      component: target,
      callable: { kind: 'synthetic', callableName: 'run' },
    })
  })

  it('rejects several implementations in strict mode', () => {
    const project = new Project({ useInMemoryFileSystem: true })
    const sourceFile = project.createSourceFile(
      '/src/gateways.ts',
      `
        interface Gateway { run(): void }
        class FirstGateway implements Gateway { run(): void {} }
        class SecondGateway implements Gateway { run(): void {} }
      `,
    )

    expect(() =>
      resolveCallTargets({
        calls: [detectedCall('Gateway')],
        project,
        sourceFilePaths: [sourceFile.getFilePath()],
        componentIndex: ComponentIndex.parse([]),
        strict: true,
      }),
    ).toThrow(ConnectionDetectionError)
  })

  it('resolves an abstract class through its sole subclass', () => {
    const project = new Project({ useInMemoryFileSystem: true })
    const sourceFile = project.createSourceFile(
      '/src/base.ts',
      `
        abstract class Base { abstract run(): void }
        class Concrete extends Base { run(): void {} }
      `,
    )
    const concreteDeclaration = sourceFile.getClassOrThrow('Concrete')
    const concrete = component(
      'Concrete',
      sourceFile.getFilePath(),
      concreteDeclaration.getStartLineNumber(),
    )

    const [result] = resolveCallTargets({
      calls: [detectedCall('Base')],
      project,
      sourceFilePaths: [sourceFile.getFilePath()],
      componentIndex: ComponentIndex.parse([concrete]),
      strict: false,
    })

    expect(result).toMatchObject({ kind: 'component', component: concrete })
  })

  it('uses declaration text when an implemented type has no symbol', () => {
    const project = new Project({ useInMemoryFileSystem: true })
    const sourceFile = project.createSourceFile(
      '/src/missing-contract.ts',
      'class Concrete implements MissingContract { run(): void {} }',
    )
    const declaration = sourceFile.getClassOrThrow('Concrete')
    const concrete = component(
      'Concrete',
      sourceFile.getFilePath(),
      declaration.getStartLineNumber(),
    )

    const [result] = resolveCallTargets({
      calls: [detectedCall('MissingContract')],
      project,
      sourceFilePaths: [sourceFile.getFilePath()],
      componentIndex: ComponentIndex.parse([concrete]),
      strict: false,
    })

    expect(result).toMatchObject({ kind: 'component', component: concrete })
  })

  it('uses declaration text when an extended type has no symbol', () => {
    const project = new Project({ useInMemoryFileSystem: true })
    const sourceFile = project.createSourceFile(
      '/src/missing-base.ts',
      'class Concrete extends MissingBase { run(): void {} }',
    )
    const declaration = sourceFile.getClassOrThrow('Concrete')
    const concrete = component(
      'Concrete',
      sourceFile.getFilePath(),
      declaration.getStartLineNumber(),
    )

    const [result] = resolveCallTargets({
      calls: [detectedCall('MissingBase')],
      project,
      sourceFilePaths: [sourceFile.getFilePath()],
      componentIndex: ComponentIndex.parse([concrete]),
      strict: false,
    })

    expect(result).toMatchObject({ kind: 'component', component: concrete })
  })
})
