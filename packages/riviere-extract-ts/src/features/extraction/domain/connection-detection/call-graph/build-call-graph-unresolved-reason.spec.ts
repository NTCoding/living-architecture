import {
  describe, it, expect, vi 
} from 'vitest'
import { Project } from 'ts-morph'
import { buildCallGraph } from './build-call-graph'
import { ComponentIndex } from '../component-index'
import { EnrichedComponent } from '../../value-extraction/enriched-component'
import { CallGraphOptions } from './call-graph-types'

vi.mock('./type-resolver', async () => {
  const actual = await vi.importActual<typeof import('./type-resolver')>('./type-resolver')
  return {
    ...actual,
    resolveCallExpressionReceiverType: vi.fn(() => ({
      resolved: false,
      typeName: undefined,
      reason: undefined,
    })),
  }
})

describe('buildCallGraph unresolved receiver fallback', () => {
  it('records default uncertainty reason when receiver type is unresolved without a reason', () => {
    const project = new Project({
      useInMemoryFileSystem: true,
      compilerOptions: {
        strict: true,
        target: 99,
        module: 99,
      },
    })
    const filePath = '/src/build-call-graph-unresolved.ts'
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

    const caller = new EnrichedComponent({
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
    const options = new CallGraphOptions({
      strict: false,
      sourceFilePaths: [filePath],
      repository: 'test-repo',
    })

    const result = buildCallGraph(project, [caller], new ComponentIndex([caller]), options)

    expect(result).toStrictEqual([
      expect.objectContaining({
        source: 'orders:orders-module:useCase:caller',
        target: '_unresolved',
        _uncertain: 'Receiver type unresolved',
      }),
    ])
  })
})
