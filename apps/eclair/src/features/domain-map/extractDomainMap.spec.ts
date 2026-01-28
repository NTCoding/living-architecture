import {
  describe, it, expect 
} from 'vitest'
import {
  extractDomainMap, getConnectedDomains 
} from './extractDomainMap'
import type { DomainEdge } from './extractDomainMap'
import type { RiviereGraph } from '@/types/riviere'
import {
  parseNode,
  parseEdge,
  parseDomainMetadata,
} from '@/platform/infra/__fixtures__/riviere-test-fixtures'

const testSourceLocation = {
  repository: 'test-repo',
  filePath: 'src/test.ts',
}

function createMinimalGraph(overrides: Partial<RiviereGraph> = {}): RiviereGraph {
  return {
    version: '1.0',
    metadata: {
      domains: parseDomainMetadata({
        'test-domain': {
          description: 'Test domain',
          systemType: 'domain',
        },
      }),
    },
    components: [],
    links: [],
    ...overrides,
  }
}

describe('extractDomainMap', () => {
  describe('domain node extraction', () => {
    it('returns empty arrays when graph has no nodes', () => {
      const graph = createMinimalGraph()

      const result = extractDomainMap(graph)

      expect(result.domainNodes).toStrictEqual([])
      expect(result.domainEdges).toStrictEqual([])
    })

    it('creates one domain node per unique domain', () => {
      const graph = createMinimalGraph({
        components: [
          parseNode({
            sourceLocation: testSourceLocation,
            id: 'n1',
            type: 'API',
            name: 'API 1',
            domain: 'orders',
            module: 'm1',
          }),
          parseNode({
            sourceLocation: testSourceLocation,
            id: 'n2',
            type: 'UseCase',
            name: 'UC 1',
            domain: 'orders',
            module: 'm1',
          }),
          parseNode({
            sourceLocation: testSourceLocation,
            id: 'n3',
            type: 'Event',
            name: 'Ev 1',
            domain: 'payments',
            module: 'm2',
            eventName: 'Ev1',
          }),
        ],
      })

      const result = extractDomainMap(graph)

      expect(result.domainNodes).toHaveLength(2)
      expect(result.domainNodes.map((d) => d.id).sort((a, b) => a.localeCompare(b))).toStrictEqual([
        'orders',
        'payments',
      ])
    })

    it('counts nodes per domain correctly', () => {
      const graph = createMinimalGraph({
        components: [
          parseNode({
            sourceLocation: testSourceLocation,
            id: 'n1',
            type: 'API',
            name: 'API 1',
            domain: 'orders',
            module: 'm1',
          }),
          parseNode({
            sourceLocation: testSourceLocation,
            id: 'n2',
            type: 'UseCase',
            name: 'UC 1',
            domain: 'orders',
            module: 'm1',
          }),
          parseNode({
            sourceLocation: testSourceLocation,
            id: 'n3',
            type: 'DomainOp',
            name: 'Op 1',
            domain: 'orders',
            module: 'm1',
            operationName: 'op1',
          }),
          parseNode({
            sourceLocation: testSourceLocation,
            id: 'n4',
            type: 'Event',
            name: 'Ev 1',
            domain: 'payments',
            module: 'm2',
            eventName: 'Ev1',
          }),
        ],
      })

      const result = extractDomainMap(graph)

      const ordersNode = result.domainNodes.find((d) => d.id === 'orders')
      const paymentsNode = result.domainNodes.find((d) => d.id === 'payments')

      expect(ordersNode?.data.nodeCount).toBe(3)
      expect(paymentsNode?.data.nodeCount).toBe(1)
    })

    it('includes domain label in node data', () => {
      const graph = createMinimalGraph({
        components: [
          parseNode({
            sourceLocation: testSourceLocation,
            id: 'n1',
            type: 'API',
            name: 'API 1',
            domain: 'orders',
            module: 'm1',
          }),
        ],
      })

      const result = extractDomainMap(graph)

      expect(result.domainNodes[0]?.data.label).toBe('orders')
    })
  })

  describe('domain edge extraction', () => {
    it('aggregates edges between domains', () => {
      const graph = createMinimalGraph({
        components: [
          parseNode({
            sourceLocation: testSourceLocation,
            id: 'n1',
            type: 'API',
            name: 'API 1',
            domain: 'orders',
            module: 'm1',
          }),
          parseNode({
            sourceLocation: testSourceLocation,
            id: 'n2',
            type: 'UseCase',
            name: 'UC 1',
            domain: 'payments',
            module: 'm2',
          }),
        ],
        links: [
          parseEdge({
            source: 'n1',
            target: 'n2',
            type: 'sync',
          }),
        ],
      })

      const result = extractDomainMap(graph)

      expect(result.domainEdges).toHaveLength(1)
      expect(result.domainEdges[0]?.source).toBe('orders')
      expect(result.domainEdges[0]?.target).toBe('payments')
    })

    it('excludes edges within the same domain', () => {
      const graph = createMinimalGraph({
        components: [
          parseNode({
            sourceLocation: testSourceLocation,
            id: 'n1',
            type: 'API',
            name: 'API 1',
            domain: 'orders',
            module: 'm1',
          }),
          parseNode({
            sourceLocation: testSourceLocation,
            id: 'n2',
            type: 'UseCase',
            name: 'UC 1',
            domain: 'orders',
            module: 'm1',
          }),
        ],
        links: [
          parseEdge({
            source: 'n1',
            target: 'n2',
            type: 'sync',
          }),
        ],
      })

      const result = extractDomainMap(graph)

      expect(result.domainEdges).toStrictEqual([])
    })

    it('counts API calls between domains', () => {
      const graph = createMinimalGraph({
        components: [
          parseNode({
            sourceLocation: testSourceLocation,
            id: 'n1',
            type: 'API',
            name: 'API 1',
            domain: 'orders',
            module: 'm1',
          }),
          parseNode({
            sourceLocation: testSourceLocation,
            id: 'n2',
            type: 'UseCase',
            name: 'UC 1',
            domain: 'orders',
            module: 'm1',
          }),
          parseNode({
            sourceLocation: testSourceLocation,
            id: 'n3',
            type: 'API',
            name: 'API 2',
            domain: 'payments',
            module: 'm2',
          }),
        ],
        links: [
          parseEdge({
            source: 'n1',
            target: 'n3',
            type: 'sync',
          }),
          parseEdge({
            source: 'n2',
            target: 'n3',
            type: 'sync',
          }),
        ],
      })

      const result = extractDomainMap(graph)

      expect(result.domainEdges).toHaveLength(1)
      expect(result.domainEdges[0]?.data?.apiCount).toBe(2)
      expect(result.domainEdges[0]?.data?.eventCount).toBe(0)
    })

    it('counts event flows between domains', () => {
      const graph = createMinimalGraph({
        components: [
          parseNode({
            sourceLocation: testSourceLocation,
            id: 'n1',
            type: 'Event',
            name: 'Ev 1',
            domain: 'orders',
            module: 'm1',
            eventName: 'Ev1',
          }),
          parseNode({
            sourceLocation: testSourceLocation,
            id: 'n2',
            type: 'EventHandler',
            name: 'EH 1',
            domain: 'payments',
            module: 'm2',
            subscribedEvents: ['Ev1'],
          }),
        ],
        links: [
          parseEdge({
            source: 'n1',
            target: 'n2',
            type: 'async',
          }),
        ],
      })

      const result = extractDomainMap(graph)

      expect(result.domainEdges[0]?.data?.eventCount).toBe(1)
      expect(result.domainEdges[0]?.data?.apiCount).toBe(0)
    })

    it('handles edges with unknown type', () => {
      const graph = createMinimalGraph({
        components: [
          parseNode({
            sourceLocation: testSourceLocation,
            id: 'n1',
            type: 'API',
            name: 'API 1',
            domain: 'orders',
            module: 'm1',
          }),
          parseNode({
            sourceLocation: testSourceLocation,
            id: 'n2',
            type: 'API',
            name: 'API 2',
            domain: 'payments',
            module: 'm2',
          }),
        ],
        links: [
          parseEdge({
            source: 'n1',
            target: 'n2',
          }),
        ],
      })

      const result = extractDomainMap(graph)

      expect(result.domainEdges).toHaveLength(1)
      expect(result.domainEdges[0]?.data?.connections[0]?.type).toBe('unknown')
    })
  })
})

describe('external edges', () => {
  it('populates connection details for external edges', () => {
    const graph = createMinimalGraph({
      components: [
        parseNode({
          sourceLocation: testSourceLocation,
          id: 'n1',
          type: 'UseCase',
          name: 'PlaceOrder',
          domain: 'orders',
          module: 'm1',
        }),
        parseNode({
          sourceLocation: testSourceLocation,
          id: 'n2',
          type: 'API',
          name: 'CreatePayment',
          domain: 'orders',
          module: 'm1',
        }),
      ],
      links: [],
      externalLinks: [
        {
          source: 'n1',
          target: {
            name: 'Stripe',
            url: 'https://stripe.com',
          },
          type: 'sync',
        },
        {
          source: 'n2',
          target: {
            name: 'Stripe',
            url: 'https://stripe.com',
          },
          type: 'async',
        },
      ],
    })

    const result = extractDomainMap(graph)

    const stripeEdge = result.domainEdges.find((e) => e.target === 'external:Stripe')
    expect(stripeEdge?.data?.connections).toHaveLength(2)
    expect(stripeEdge?.data?.connections).toContainEqual({
      sourceName: 'PlaceOrder',
      targetName: 'Stripe',
      type: 'sync',
      targetNodeType: 'External',
    })
    expect(stripeEdge?.data?.connections).toContainEqual({
      sourceName: 'CreatePayment',
      targetName: 'Stripe',
      type: 'async',
      targetNodeType: 'External',
    })
  })
})

describe('getConnectedDomains', () => {
  it('returns empty set when domain has no connections', () => {
    const edges: DomainEdge[] = []

    const result = getConnectedDomains('orders', edges)

    expect(result.size).toBe(0)
  })

  it('returns domains that the source domain connects to', () => {
    const edges: DomainEdge[] = [
      {
        id: 'e1',
        source: 'orders',
        target: 'payments',
        data: {
          apiCount: 1,
          eventCount: 0,
          connections: [],
        },
      },
      {
        id: 'e2',
        source: 'orders',
        target: 'shipping',
        data: {
          apiCount: 0,
          eventCount: 1,
          connections: [],
        },
      },
    ]

    const result = getConnectedDomains('orders', edges)

    expect(result).toContain('payments')
    expect(result).toContain('shipping')
  })

  it('returns domains that connect to the target domain', () => {
    const edges: DomainEdge[] = [
      {
        id: 'e1',
        source: 'orders',
        target: 'payments',
        data: {
          apiCount: 1,
          eventCount: 0,
          connections: [],
        },
      },
      {
        id: 'e2',
        source: 'shipping',
        target: 'payments',
        data: {
          apiCount: 1,
          eventCount: 0,
          connections: [],
        },
      },
    ]

    const result = getConnectedDomains('payments', edges)

    expect(result).toContain('orders')
    expect(result).toContain('shipping')
  })

  it('returns both incoming and outgoing connections', () => {
    const edges: DomainEdge[] = [
      {
        id: 'e1',
        source: 'orders',
        target: 'payments',
        data: {
          apiCount: 1,
          eventCount: 0,
          connections: [],
        },
      },
      {
        id: 'e2',
        source: 'payments',
        target: 'notifications',
        data: {
          apiCount: 1,
          eventCount: 0,
          connections: [],
        },
      },
    ]

    const result = getConnectedDomains('payments', edges)

    expect(result).toContain('orders')
    expect(result).toContain('notifications')
  })
})
