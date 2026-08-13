import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { RiviereQuery } from '@living-architecture/riviere-builder/query'
import {
  type TestContext,
  createTestContext,
  setupCommandTest,
} from '../../../platform/__fixtures__/command-test-fixtures'
import { TraceFlow } from './trace-flow'
import { FlowTraceLoader } from '../data-access/graph/query-loaders'
import { FoundFlowTrace } from './trace-flow-result'

class UnexpectedLoaderError extends Error {}

class ThrowingFlowTraceLoader extends FlowTraceLoader {
  override load(): never {
    throw new UnexpectedLoaderError('unexpected loader failure')
  }
}

describe('traceFlow command', () => {
  const ctx: TestContext = createTestContext()
  setupCommandTest(ctx)

  it('returns near-match suggestions when component is not found', async () => {
    const graphDir = join(ctx.testDir, '.riviere')
    await mkdir(graphDir, { recursive: true })
    await writeFile(
      join(graphDir, 'graph.json'),
      JSON.stringify({
        components: [
          {
            domain: 'orders',
            id: 'orders:checkout:usecase:place-order',
            module: 'checkout',
            name: 'place-order',
            sourceLocation: {
              filePath: 'src/usecase.ts',
              repository: 'https://github.com/org/repo',
            },
            type: 'UseCase',
          },
        ],
        links: [],
        metadata: {
          domains: {
            orders: {
              description: 'Orders',
              systemType: 'domain',
            },
          },
          sources: [{ repository: 'https://github.com/org/repo' }],
        },
        version: '1.0',
      }),
      'utf-8',
    )

    expect(
      new TraceFlow(new FlowTraceLoader()).execute({
        componentId: 'orders:checkout:usecase:place-orde',
        graphPathOption: undefined,
      }),
    ).toMatchObject({
      success: false,
      suggestions: ['orders:checkout:usecase:place-order'],
    })
  })

  it('returns no suggestions when the missing component ID is invalid', async () => {
    const graphDir = join(ctx.testDir, '.riviere')
    await mkdir(graphDir, { recursive: true })
    await writeFile(
      join(graphDir, 'graph.json'),
      JSON.stringify({
        components: [
          {
            domain: 'orders',
            id: 'orders:checkout:usecase:place-order',
            module: 'checkout',
            name: 'place-order',
            sourceLocation: {
              filePath: 'src/usecase.ts',
              repository: 'https://github.com/org/repo',
            },
            type: 'UseCase',
          },
        ],
        links: [],
        metadata: {
          domains: { orders: { description: 'Orders', systemType: 'domain' } },
          sources: [{ repository: 'https://github.com/org/repo' }],
        },
        version: '1.0',
      }),
      'utf-8',
    )

    expect(
      new TraceFlow(new FlowTraceLoader()).execute({
        componentId: 'invalid',
        graphPathOption: undefined,
      }),
    ).toMatchObject({ success: false, suggestions: [] })
  })

  it('rethrows an unexpected loader failure', () => {
    expect(() =>
      new TraceFlow(new ThrowingFlowTraceLoader()).execute({
        componentId: 'orders:checkout:usecase:place-order',
        graphPathOption: undefined,
      }),
    ).toThrow('unexpected loader failure')
  })

  it('rethrows an unexpected flow query failure', () => {
    vi.spyOn(RiviereQuery.prototype, 'traceFlow').mockImplementationOnce(() => {
      throw new UnexpectedLoaderError('unexpected query failure')
    })

    expect(() =>
      FoundFlowTrace.parse(
        {
          components: [
            {
              domain: 'orders',
              id: 'orders:checkout:usecase:place-order',
              module: 'checkout',
              name: 'place-order',
              sourceLocation: {
                filePath: 'src/usecase.ts',
                repository: 'https://github.com/org/repo',
              },
              type: 'UseCase',
            },
          ],
          links: [],
          metadata: {
            domains: { orders: { description: 'Orders', systemType: 'domain' } },
            sources: [{ repository: 'https://github.com/org/repo' }],
          },
          version: '1.0',
        },
        'orders:checkout:usecase:place-order',
      ),
    ).toThrow('unexpected query failure')
  })
})
