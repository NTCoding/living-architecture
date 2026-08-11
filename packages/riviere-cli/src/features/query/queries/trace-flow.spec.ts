import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  type TestContext,
  createTestContext,
  setupCommandTest,
} from '../../../platform/__fixtures__/command-test-fixtures'
import { TraceFlow } from './trace-flow'
import { FlowTraceLoader } from '../data-access/query-loaders'

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
})
