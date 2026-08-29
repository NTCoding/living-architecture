import { describe, expect, it } from 'vitest'
import { createProject } from '../__fixtures__/detect-connections-fixtures'
import { EnrichedComponent } from '../../value-extraction/enriched-component'
import { ComponentIndex } from '../component-index'
import { ConnectionDetectionError } from '../connection-detection-error'
import { CallSite } from './call-graph-types'
import { CallableReference } from './callable-reference'
import { DetectedCall } from './detected-call'

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

describe('DetectedCall.resolveTarget', () => {
  it('uses a default reason when the receiver type is absent', () => {
    const project = createProject()

    const result = detectedCall().resolveTarget({
      project,
      sourceFilePaths: [],
      componentIndex: ComponentIndex.parse([]),
      strict: false,
    })

    expect(result?.resolution).toStrictEqual({
      kind: 'unresolved',
      reason: 'Receiver type unresolved',
    })
  })

  it('creates a synthetic callable when a component method is not in the project', () => {
    const target = component('Target', '/src/target.ts', 4)
    const project = createProject()

    const result = detectedCall('Target').resolveTarget({
      project,
      sourceFilePaths: [],
      componentIndex: ComponentIndex.parse([target]),
      strict: false,
    })

    expect(result?.resolution).toMatchObject({
      kind: 'component',
      component: target,
      callable: { kind: 'synthetic', callableName: 'run' },
    })
  })

  it('rejects several implementations in strict mode', () => {
    const project = createProject()
    const sourceFile = project.createSourceFile(
      '/src/gateways.ts',
      `
        interface Gateway { run(): void }
        class FirstGateway implements Gateway { run(): void {} }
        class SecondGateway implements Gateway { run(): void {} }
      `,
    )

    expect(() =>
      detectedCall('Gateway').resolveTarget({
        project,
        sourceFilePaths: [sourceFile.getFilePath()],
        componentIndex: ComponentIndex.parse([]),
        strict: true,
      }),
    ).toThrow(ConnectionDetectionError)
  })

  it('resolves an abstract class through its sole subclass', () => {
    const project = createProject()
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

    const result = detectedCall('Base').resolveTarget({
      project,
      sourceFilePaths: [sourceFile.getFilePath()],
      componentIndex: ComponentIndex.parse([concrete]),
      strict: false,
    })

    expect(result?.resolution).toMatchObject({ kind: 'component', component: concrete })
  })

  it('uses declaration text when an implemented type has no symbol', () => {
    const project = createProject()
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

    const result = detectedCall('MissingContract').resolveTarget({
      project,
      sourceFilePaths: [sourceFile.getFilePath()],
      componentIndex: ComponentIndex.parse([concrete]),
      strict: false,
    })

    expect(result?.resolution).toMatchObject({ kind: 'component', component: concrete })
  })

  it('uses declaration text when an extended type has no symbol', () => {
    const project = createProject()
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

    const result = detectedCall('MissingBase').resolveTarget({
      project,
      sourceFilePaths: [sourceFile.getFilePath()],
      componentIndex: ComponentIndex.parse([concrete]),
      strict: false,
    })

    expect(result?.resolution).toMatchObject({ kind: 'component', component: concrete })
  })
})
