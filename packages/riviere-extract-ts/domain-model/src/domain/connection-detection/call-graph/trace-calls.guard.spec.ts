import { Project } from 'ts-morph'
import { describe, expect, it, vi } from 'vitest'
import { EnrichedComponent } from '../../value-extraction/enriched-component'
import { ComponentIndex } from '../component-index'
import { MissingResolvedTypeNameError } from '../../extraction-errors'
import { CallGraphOptions, CallSite } from './call-graph-types'
import { traceCallsInBody } from './trace-calls'

vi.mock('./type-resolver', async () => {
  const actual = await vi.importActual<typeof import('./type-resolver')>('./type-resolver')
  return {
    ...actual,
    resolveCallExpressionReceiverType: vi.fn(() => ({
      resolved: true,
      typeName: undefined,
      reason: undefined,
    })),
  }
})

describe('traceCallsInBody guards', () => {
  it('throws a missing resolved type name error when traced receiver type has no type name', () => {
    const project = new Project({
      useInMemoryFileSystem: true,
      compilerOptions: {
        strict: true,
        target: 99,
        module: 99,
      },
    })
    const filePath = '/src/trace-calls-guard.ts'
    project.createSourceFile(
      filePath,
      [
        'class Target { run(): void {} }',
        'class Caller {',
        '  private target: Target',
        '  constructor(target: Target) { this.target = target }',
        '  execute(): void { this.target.run() }',
        '}',
      ].join('\n'),
    )

    const sourceFile = project.getSourceFileOrThrow(filePath)
    const method = sourceFile.getClassOrThrow('Caller').getMethodOrThrow('execute')
    const component = EnrichedComponent.parse({
      type: 'useCase',
      name: 'Caller',
      location: {
        file: filePath,
        line: 2,
      },
      domain: 'orders',
      module: 'orders-module',
      metadata: {},
      _missing: undefined,
    })
    const originCallSite = CallSite.parse({
      filePath,
      lineNumber: 5,
      methodName: 'execute',
    })
    const options = CallGraphOptions.parse({
      strict: false,
      sourceFilePaths: [filePath],
      repository: 'test-repo',
    })

    expect(() =>
      traceCallsInBody(
        method,
        project,
        ComponentIndex.parse([component]),
        component,
        originCallSite,
        new Set<string>(),
        [],
        [],
        options,
      ),
    ).toThrow(MissingResolvedTypeNameError)
    expect(() =>
      traceCallsInBody(
        method,
        project,
        ComponentIndex.parse([component]),
        component,
        originCallSite,
        new Set<string>(),
        [],
        [],
        options,
      ),
    ).toThrow('Expected resolved type name')
  })
})
