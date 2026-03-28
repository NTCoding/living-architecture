import {
  describe, expect, it, vi 
} from 'vitest'
import { LayoutError } from '@/platform/infra/errors/errors'
import { parseNode } from '@/platform/infra/__fixtures__/riviere-test-fixtures'
import { createSimulationNodes } from '../ForceGraph/VisualizationDataAdapters'

vi.mock('d3', async () => {
  const actual = await vi.importActual<typeof import('d3')>('d3')

  return {
    ...actual,
    packEnclose: vi.fn(() => ({
      x: Number.NaN,
      y: 0,
      r: 10,
    })),
  }
})

const { packDomainNodes } = await import('./computeCircleEnclosures')

const sourceLocation = {
  repository: 'test-repo',
  filePath: 'src/test.ts',
}

describe('computeCircleEnclosures non-finite enclosure', () => {
  it('throws when d3 cannot compute a finite enclosure', () => {
    const nodes = createSimulationNodes([
      parseNode({
        sourceLocation,
        id: 'orders-api',
        type: 'API',
        name: 'Orders API',
        domain: 'orders',
        module: 'api',
      }),
    ])

    expect(() =>
      packDomainNodes({
        nodes,
        clusters: [
          {
            id: 'orders',
            domain: 'orders',
            label: 'Orders',
            nodeIds: ['orders-api'],
          },
        ],
        getNodeRadius: () => 16,
      }),
    ).toThrowError(new LayoutError("Unable to compute enclosure for domain 'orders'"))
  })
})
