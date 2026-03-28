import {
  describe, expect, it, vi 
} from 'vitest'
import { LayoutError } from '@/platform/infra/errors/errors'
import {
  parseNode, parseEdge 
} from '@/platform/infra/__fixtures__/riviere-test-fixtures'
import * as circleEnclosures from '@/platform/infra/graph/ClusteredGraph/computeCircleEnclosures'
import { computeClusteredGraphLayout } from './computeClusteredGraphLayout'

const sourceLocation = {
  repository: 'test-repo',
  filePath: 'src/test.ts',
}

const { renderClusteredGraphvizLayout } = vi.hoisted(() => ({renderClusteredGraphvizLayout: vi.fn(),}))

vi.mock('@/platform/infra/graph/graphviz/renderClusteredGraphvizLayout', () => ({renderClusteredGraphvizLayout,}))

describe('computeClusteredGraphLayout', () => {
  it('lays out internal and external nodes and returns sorted domains', async () => {
    renderClusteredGraphvizLayout.mockResolvedValue({
      positions: new Map([
        [
          'domain:orders',
          {
            x: 100,
            y: 120,
          },
        ],
        [
          'domain:shipping',
          {
            x: 320,
            y: 180,
          },
        ],
        [
          'external:Stripe',
          {
            x: 560,
            y: 160,
          },
        ],
      ]),
    })

    const result = await computeClusteredGraphLayout({
      nodes: [
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
          id: 'shipping-worker',
          type: 'UseCase',
          name: 'Shipping Worker',
          domain: 'shipping',
          module: 'jobs',
        }),
      ],
      edges: [
        parseEdge({
          source: 'orders-api',
          target: 'shipping-worker',
          type: 'sync',
        }),
      ],
      externalLinks: [
        {
          source: 'orders-api',
          type: 'async',
          target: {
            name: 'Stripe',
            url: 'https://stripe.test',
          },
        },
      ],
    })

    expect(renderClusteredGraphvizLayout).toHaveBeenCalledOnce()
    expect(result.uniqueDomains).toStrictEqual(['orders', 'shipping'])
    expect(result.circles.map((circle) => circle.domain)).toStrictEqual(['orders', 'shipping'])
    expect(result.nodes.some((node) => node.id === 'external:Stripe')).toBe(true)
  })

  it('returns positioned links and node coordinates from layout output', async () => {
    renderClusteredGraphvizLayout.mockResolvedValue({
      positions: new Map([
        [
          'domain:orders',
          {
            x: 100,
            y: 120,
          },
        ],
        [
          'domain:shipping',
          {
            x: 320,
            y: 180,
          },
        ],
        [
          'external:Stripe',
          {
            x: 560,
            y: 160,
          },
        ],
      ]),
    })

    const result = await computeClusteredGraphLayout({
      nodes: [
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
          id: 'shipping-worker',
          type: 'UseCase',
          name: 'Shipping Worker',
          domain: 'shipping',
          module: 'jobs',
        }),
      ],
      edges: [
        parseEdge({
          source: 'orders-api',
          target: 'shipping-worker',
          type: 'sync',
        }),
      ],
      externalLinks: [
        {
          source: 'orders-api',
          type: 'async',
          target: {
            name: 'Stripe',
            url: 'https://stripe.test',
          },
        },
      ],
    })

    expect(result.links.some((link) => link.target === 'external:Stripe')).toBe(true)
    expect(result.nodes.find((node) => node.id === 'orders-api')).toStrictEqual(
      expect.objectContaining({
        x: expect.any(Number),
        y: expect.any(Number),
      }),
    )
  })

  it('throws when a domain position is missing from graphviz output', async () => {
    renderClusteredGraphvizLayout.mockResolvedValue({ positions: new Map() })

    await expect(
      computeClusteredGraphLayout({
        nodes: [
          parseNode({
            sourceLocation,
            id: 'orders-api',
            type: 'API',
            name: 'Orders API',
            domain: 'orders',
            module: 'api',
          }),
        ],
        edges: [],
        externalLinks: [],
      }),
    ).rejects.toStrictEqual(
      expect.objectContaining({ message: "Missing Graphviz position for domain 'orders'" }),
    )
  })

  it('throws when an external node position is missing from graphviz output', async () => {
    renderClusteredGraphvizLayout.mockResolvedValue({
      positions: new Map([
        [
          'domain:orders',
          {
            x: 100,
            y: 120,
          },
        ],
      ]),
    })

    await expect(
      computeClusteredGraphLayout({
        nodes: [
          parseNode({
            sourceLocation,
            id: 'orders-api',
            type: 'API',
            name: 'Orders API',
            domain: 'orders',
            module: 'api',
          }),
        ],
        edges: [],
        externalLinks: [
          {
            source: 'orders-api',
            type: 'async',
            target: {
              name: 'Stripe',
              url: 'https://stripe.test',
            },
          },
        ],
      }),
    ).rejects.toBeInstanceOf(LayoutError)
  })

  it('deduplicates inter-domain layout edges and handles undefined external links', async () => {
    renderClusteredGraphvizLayout.mockResolvedValue({
      positions: new Map([
        [
          'domain:alpha',
          {
            x: 100,
            y: 100,
          },
        ],
        [
          'domain:beta',
          {
            x: 320,
            y: 160,
          },
        ],
      ]),
    })

    await computeClusteredGraphLayout({
      nodes: [
        parseNode({
          sourceLocation,
          id: 'alpha-api',
          type: 'API',
          name: 'Alpha API',
          domain: 'alpha',
          module: 'api',
        }),
        parseNode({
          sourceLocation,
          id: 'alpha-worker',
          type: 'UseCase',
          name: 'Alpha Worker',
          domain: 'alpha',
          module: 'core',
        }),
        parseNode({
          sourceLocation,
          id: 'beta-worker',
          type: 'UseCase',
          name: 'Beta Worker',
          domain: 'beta',
          module: 'core',
        }),
      ],
      edges: [
        parseEdge({
          source: 'alpha-api',
          target: 'beta-worker',
          type: 'sync',
        }),
        parseEdge({
          source: 'alpha-worker',
          target: 'beta-worker',
          type: 'sync',
        }),
        parseEdge({
          source: 'alpha-api',
          target: 'alpha-worker',
          type: 'sync',
        }),
      ],
      externalLinks: undefined,
    })

    expect(renderClusteredGraphvizLayout).toHaveBeenLastCalledWith(
      expect.objectContaining({
        edges: [
          {
            source: 'domain:alpha',
            target: 'domain:beta',
          },
        ],
      }),
    )
  })

  it('skips external links from unknown sources and deduplicates repeated external targets', async () => {
    renderClusteredGraphvizLayout.mockResolvedValue({
      positions: new Map([
        [
          'domain:alpha',
          {
            x: 100,
            y: 100,
          },
        ],
        [
          'external:VendorWithAnExcessivelyLongName',
          {
            x: 320,
            y: 160,
          },
        ],
        [
          'external:Ignored Vendor',
          {
            x: 420,
            y: 200,
          },
        ],
      ]),
    })

    await computeClusteredGraphLayout({
      nodes: [
        parseNode({
          sourceLocation,
          id: 'alpha-api',
          type: 'API',
          name: 'Alpha API',
          domain: 'alpha',
          module: 'api',
        }),
      ],
      edges: [],
      externalLinks: [
        {
          source: 'alpha-api',
          type: 'async',
          target: {
            name: 'VendorWithAnExcessivelyLongName',
            url: 'https://vendor.test/one',
          },
        },
        {
          source: 'alpha-api',
          type: 'async',
          target: {
            name: 'VendorWithAnExcessivelyLongName',
            url: 'https://vendor.test/two',
          },
        },
        {
          source: 'missing-node',
          type: 'async',
          target: {
            name: 'Ignored Vendor',
            url: 'https://vendor.test/ignored',
          },
        },
      ],
    })

    expect(renderClusteredGraphvizLayout).toHaveBeenLastCalledWith(
      expect.objectContaining({
        nodes: expect.arrayContaining([
          expect.objectContaining({
            id: 'external:VendorWithAnExcessivelyLongName',
            label: 'VendorWithAnExc...',
            widthPx: 172,
          }),
        ]),
        edges: [
          {
            source: 'domain:alpha',
            target: 'external:VendorWithAnExcessivelyLongName',
          },
        ],
      }),
    )
  })

  it('throws when packed node offsets reference a missing internal node', async () => {
    const packDomainNodesSpy = vi.spyOn(circleEnclosures, 'packDomainNodes').mockReturnValue([
      {
        id: 'cluster_orders',
        domain: 'orders',
        label: 'Orders',
        r: 88,
        nodeIds: ['orders-api'],
        nodeOffsets: new Map([
          [
            'missing-node',
            {
              x: 0,
              y: 0,
            },
          ],
        ]),
      },
    ])
    renderClusteredGraphvizLayout.mockResolvedValue({
      positions: new Map([
        [
          'domain:orders',
          {
            x: 100,
            y: 120,
          },
        ],
      ]),
    })

    await expect(
      computeClusteredGraphLayout({
        nodes: [
          parseNode({
            sourceLocation,
            id: 'orders-api',
            type: 'API',
            name: 'Orders API',
            domain: 'orders',
            module: 'api',
          }),
        ],
        edges: [],
        externalLinks: [],
      }),
    ).rejects.toStrictEqual(
      expect.objectContaining({message: "Packed node 'missing-node' not found in clustered graph layout",}),
    )

    packDomainNodesSpy.mockRestore()
  })
})
