import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { ComponentSummaryStats } from '@living-architecture/riviere-builder-domain-model/query/component-summary-stats'
import {
  type TestContext,
  createTestContext,
  setupCommandTest,
} from '../../../__fixtures__/command-test-fixtures'
import {
  ComponentChecklistLoader,
  ComponentSummaryLoader,
} from '../data-access/graph/query-loaders'
import { ComponentChecklist } from './component-checklist'
import { ComponentSummary } from './component-summary'

async function writeGraph(testDir: string, content: string): Promise<string> {
  const graphDir = join(testDir, '.riviere')
  await mkdir(graphDir, { recursive: true })
  const graphPath = join(graphDir, 'graph.json')
  await writeFile(graphPath, content, 'utf-8')
  return graphPath
}

function graphWithUseCase(): string {
  return JSON.stringify({
    components: [
      {
        id: 'orders:checkout:usecase:place-order',
        type: 'UseCase',
        name: 'Place Order',
        domain: 'orders',
        module: 'checkout',
        description: 'Places an order',
        sourceLocation: {
          repository: 'https://github.com/org/repo',
          filePath: 'src/place-order.ts',
        },
      },
    ],
    links: [],
    metadata: {
      domains: { orders: { description: 'Orders', systemType: 'domain' } },
      sources: [{ repository: 'https://github.com/org/repo' }],
    },
    version: '1.0',
  })
}

class UnexpectedLoaderFailure extends Error {}

describe('component inspection queries', () => {
  const ctx: TestContext = createTestContext()
  setupCommandTest(ctx)

  it('returns component summary statistics', async () => {
    await writeGraph(ctx.testDir, graphWithUseCase())

    const result = new ComponentSummary(new ComponentSummaryLoader()).execute({
      graphFileLocation: '.riviere/graph.json',
    })

    expect(result).toMatchObject({
      result: { success: true, stats: expect.any(ComponentSummaryStats) },
    })
    expect(result.result).toHaveProperty('stats.componentCount', 1)
  })

  it('filters the component checklist by type', async () => {
    await writeGraph(ctx.testDir, graphWithUseCase())
    const checklist = new ComponentChecklist(new ComponentChecklistLoader())

    expect(
      checklist.execute({ graphFileLocation: '.riviere/graph.json', type: 'UseCase' }),
    ).toMatchObject({ result: { success: true, total: 1 } })
    expect(
      checklist.execute({ graphFileLocation: '.riviere/graph.json', type: 'API' }),
    ).toMatchObject({ result: { success: true, total: 0 } })
  })

  it('returns checklist validation and graph loading failures', async () => {
    await writeGraph(ctx.testDir, '{invalid')
    const checklist = new ComponentChecklist(new ComponentChecklistLoader())

    expect(
      checklist.execute({ graphFileLocation: '.riviere/graph.json', type: 'invalid' }),
    ).toMatchObject({
      result: { code: 'VALIDATION_ERROR', success: false },
    })
    expect(
      checklist.execute({ graphFileLocation: '.riviere/graph.json', type: undefined }),
    ).toMatchObject({
      result: { code: 'GRAPH_CORRUPTED', success: false },
    })
    expect(checklist.execute({ graphFileLocation: 'missing.json', type: undefined })).toMatchObject(
      { result: { code: 'GRAPH_NOT_FOUND', success: false } },
    )
  })

  it('returns summary graph loading failures', async () => {
    await writeGraph(ctx.testDir, '{invalid')
    const summary = new ComponentSummary(new ComponentSummaryLoader())

    expect(summary.execute({ graphFileLocation: 'missing.json' })).toMatchObject({
      result: { code: 'GRAPH_NOT_FOUND', success: false },
    })
    expect(summary.execute({ graphFileLocation: '.riviere/graph.json' })).toMatchObject({
      result: { code: 'GRAPH_CORRUPTED', success: false },
    })
  })

  it('does not conceal unexpected loader failures', () => {
    const unexpected = new UnexpectedLoaderFailure('unexpected loader failure')
    const checklist = new ComponentChecklist({
      load: () => {
        throw unexpected
      },
    })
    const summary = new ComponentSummary({
      load: () => {
        throw unexpected
      },
    })

    expect(() => checklist.execute({ graphFileLocation: 'graph.json', type: undefined })).toThrow(
      unexpected,
    )
    expect(() => summary.execute({ graphFileLocation: 'graph.json' })).toThrow(unexpected)
  })
})
