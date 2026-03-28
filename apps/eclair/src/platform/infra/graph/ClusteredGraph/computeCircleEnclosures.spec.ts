import {
  describe, expect, it 
} from 'vitest'
import { parseNode } from '@/platform/infra/__fixtures__/riviere-test-fixtures'
import { createSimulationNodes } from '../ForceGraph/VisualizationDataAdapters'
import {
  packDomainNodes, truncateClusteredNodeLabel 
} from './computeCircleEnclosures'

const sourceLocation = {
  repository: 'test-repo',
  filePath: 'src/test.ts',
}

describe('computeCircleEnclosures', () => {
  it('truncates long clustered node labels', () => {
    expect(truncateClusteredNodeLabel('Short name')).toBe('Short name')
    expect(truncateClusteredNodeLabel('VeryLongClusteredNodeName')).toBe('VeryLongCluster...')
  })

  it('packs cluster nodes and preserves node offsets', () => {
    const nodes = createSimulationNodes([
      parseNode({
        sourceLocation,
        id: 'orders-api',
        type: 'API',
        name: 'Orders API',
        domain: 'orders',
        module: 'api',
      }),
      parseNode({
        sourceLocation,
        id: 'orders-worker',
        type: 'UseCase',
        name: 'Orders Worker',
        domain: 'orders',
        module: 'core',
      }),
    ])

    const result = packDomainNodes({
      nodes,
      clusters: [
        {
          id: 'orders',
          domain: 'orders',
          label: 'Orders',
          nodeIds: ['orders-api', 'orders-worker'],
        },
      ],
      getNodeRadius: () => 16,
    })

    expect(result).toHaveLength(1)
    expect(result[0]).toStrictEqual(
      expect.objectContaining({
        id: 'orders',
        domain: 'orders',
        label: 'Orders',
        nodeIds: ['orders-api', 'orders-worker'],
      }),
    )
    expect(result[0]?.r).toBeGreaterThanOrEqual(88)
    expect(result[0]?.nodeOffsets.get('orders-api')).toStrictEqual(
      expect.objectContaining({
        x: expect.any(Number),
        y: expect.any(Number),
      }),
    )
  })

  it('returns no packed circles when a cluster has no matching nodes', () => {
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

    expect(
      packDomainNodes({
        nodes,
        clusters: [
          {
            id: 'billing',
            domain: 'billing',
            label: 'Billing',
            nodeIds: ['missing-node'],
          },
        ],
        getNodeRadius: () => 16,
      }),
    ).toStrictEqual([])
  })
})
