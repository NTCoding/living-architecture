import { Project } from 'ts-morph'
import { describe, expect, it, vi } from 'vitest'
import { EnrichedComponent } from '../../value-extraction/enriched-component'
import { ComponentIndex } from '../component-index'
import { buildCallGraph } from './build-call-graph'
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

    const caller = EnrichedComponent.parse({
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
    const options = CallGraphOptions.parse({
      strict: false,
      sourceFilePaths: [filePath],
      repository: 'test-repo',
    })

    const result = buildCallGraph(project, [caller], ComponentIndex.parse([caller]), options)

    expect(result).toStrictEqual([
      expect.objectContaining({
        source: 'orders:orders-module:useCase:caller',
        target: '_unresolved',
        _uncertain: 'Receiver type unresolved',
      }),
    ])
  })
})
