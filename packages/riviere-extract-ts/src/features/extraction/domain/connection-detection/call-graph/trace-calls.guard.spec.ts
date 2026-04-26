import {
  describe, it, expect, vi 
} from 'vitest'
import { Project } from 'ts-morph'
import {
  CallGraphOptions, CallSite 
} from './call-graph-types'
import { traceCallsInBody } from './trace-calls'
import { ComponentIndex } from '../component-index'
import { EnrichedComponent } from '../../value-extraction/enriched-component'

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
  it('throws TypeError when traced receiver type is marked resolved without a type name', () => {
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
    const component = new EnrichedComponent({
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
    const originCallSite = new CallSite({
      filePath,
      lineNumber: 5,
      methodName: 'execute',
    })
    const options = new CallGraphOptions({
      strict: false,
      sourceFilePaths: [filePath],
      repository: 'test-repo',
    })

    expect(() =>
      traceCallsInBody(
        method,
        project,
        new ComponentIndex([component]),
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
