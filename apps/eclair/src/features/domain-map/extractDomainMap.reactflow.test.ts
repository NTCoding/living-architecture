import {
  describe, it, expect 
} from 'vitest'
import { extractDomainMap } from './extractDomainMap'
import type { RiviereGraph } from '@/types/riviere'
import {
  parseNode, parseEdge, parseDomainMetadata 
} from '@/lib/riviereTestData'

const testSourceLocation = {
  repository: 'test-repo',
  filePath: 'src/test.ts' 
}

function createMinimalGraph(overrides: Partial<RiviereGraph> = {}): RiviereGraph {
  return {
    version: '1.0',
    metadata: {
      domains: parseDomainMetadata({
        'test-domain': {
          description: 'Test domain',
          systemType: 'domain' 
        } 
      }),
    },
    components: [],
    links: [],
    ...overrides,
  }
}

describe('extractDomainMap React Flow compatibility', () => {
  it('domain nodes have position property', () => {
    const graph = createMinimalGraph({
      components: [
        parseNode({
          sourceLocation: testSourceLocation,
          id: 'n1',
          type: 'API',
          name: 'API 1',
          domain: 'orders',
          module: 'm1' 
        }),
      ],
    })

    const result = extractDomainMap(graph)

    expect(result.domainNodes[0]?.position).toBeDefined()
    expect(typeof result.domainNodes[0]?.position.x).toBe('number')
    expect(typeof result.domainNodes[0]?.position.y).toBe('number')
  })

  it('assigns distinct positions to each domain node', () => {
    const graph = createMinimalGraph({
      components: [
        parseNode({
          sourceLocation: testSourceLocation,
          id: 'n1',
          type: 'API',
          name: 'API 1',
          domain: 'orders',
          module: 'm1' 
        }),
        parseNode({
          sourceLocation: testSourceLocation,
          id: 'n2',
          type: 'API',
          name: 'API 2',
          domain: 'payments',
          module: 'm2' 
        }),
        parseNode({
          sourceLocation: testSourceLocation,
          id: 'n3',
          type: 'API',
          name: 'API 3',
          domain: 'shipping',
          module: 'm3' 
        }),
      ],
    })

    const result = extractDomainMap(graph)

    const positions = result.domainNodes.map((n) => `${n.position.x},${n.position.y}`)
    const uniquePositions = new Set(positions)
    expect(uniquePositions.size).toBe(positions.length)
  })

  it('arranges domain nodes in a circular layout', () => {
    const graph = createMinimalGraph({
      components: [
        parseNode({
          sourceLocation: testSourceLocation,
          id: 'n1',
          type: 'API',
          name: 'API 1',
          domain: 'orders',
          module: 'm1' 
        }),
        parseNode({
          sourceLocation: testSourceLocation,
          id: 'n2',
          type: 'API',
          name: 'API 2',
          domain: 'payments',
          module: 'm2' 
        }),
        parseNode({
          sourceLocation: testSourceLocation,
          id: 'n3',
          type: 'API',
          name: 'API 3',
          domain: 'shipping',
          module: 'm3' 
        }),
        parseNode({
          sourceLocation: testSourceLocation,
          id: 'n4',
          type: 'API',
          name: 'API 4',
          domain: 'inventory',
          module: 'm4' 
        }),
      ],
    })

    const result = extractDomainMap(graph)

    const hasVaryingY = result.domainNodes.some((n) => n.position.y !== 0)
    expect(hasVaryingY).toBe(true)
  })

  it('domain nodes have type property for custom node', () => {
    const graph = createMinimalGraph({
      components: [
        parseNode({
          sourceLocation: testSourceLocation,
          id: 'n1',
          type: 'API',
          name: 'API 1',
          domain: 'orders',
          module: 'm1' 
        }),
      ],
    })

    const result = extractDomainMap(graph)

    expect(result.domainNodes[0]?.type).toBe('domain')
  })

  it('specifies source and target handles for edge routing', () => {
    const graph = createMinimalGraph({
      components: [
        parseNode({
          sourceLocation: testSourceLocation,
          id: 'n1',
          type: 'API',
          name: 'API 1',
          domain: 'orders',
          module: 'm1' 
        }),
        parseNode({
          sourceLocation: testSourceLocation,
          id: 'n2',
          type: 'UseCase',
          name: 'UC 1',
          domain: 'payments',
          module: 'm2' 
        }),
      ],
      links: [parseEdge({
        source: 'n1',
        target: 'n2',
        type: 'sync' 
      })],
    })

    const result = extractDomainMap(graph)

    expect(result.domainEdges[0]?.sourceHandle).toBeDefined()
    expect(result.domainEdges[0]?.targetHandle).toBeDefined()
  })

  it('aggregates edges by domain pair with API and event counts', () => {
    const graph = createMinimalGraph({
      components: [
        parseNode({
          sourceLocation: testSourceLocation,
          id: 'n1',
          type: 'UseCase',
          name: 'UC 1',
          domain: 'orders',
          module: 'm1' 
        }),
        parseNode({
          sourceLocation: testSourceLocation,
          id: 'n2',
          type: 'UseCase',
          name: 'UC 2',
          domain: 'orders',
          module: 'm1' 
        }),
        parseNode({
          sourceLocation: testSourceLocation,
          id: 'n3',
          type: 'Event',
          name: 'Event 1',
          domain: 'orders',
          module: 'm1',
          eventName: 'E1' 
        }),
        parseNode({
          sourceLocation: testSourceLocation,
          id: 'n4',
          type: 'API',
          name: 'API 1',
          domain: 'payments',
          module: 'm2' 
        }),
        parseNode({
          sourceLocation: testSourceLocation,
          id: 'n5',
          type: 'API',
          name: 'API 2',
          domain: 'payments',
          module: 'm2' 
        }),
        parseNode({
          sourceLocation: testSourceLocation,
          id: 'n6',
          type: 'EventHandler',
          name: 'EH 1',
          domain: 'payments',
          module: 'm2',
          subscribedEvents: ['E1'] 
        }),
      ],
      links: [
        parseEdge({
          source: 'n1',
          target: 'n4',
          type: 'sync' 
        }),
        parseEdge({
          source: 'n2',
          target: 'n5',
          type: 'sync' 
        }),
        parseEdge({
          source: 'n3',
          target: 'n6',
          type: 'async' 
        }),
      ],
    })

    const result = extractDomainMap(graph)

    expect(result.domainEdges).toHaveLength(1)
    expect(result.domainEdges[0]?.data?.apiCount).toBe(2)
    expect(result.domainEdges[0]?.data?.eventCount).toBe(1)
  })

  it('domain edges have unique id', () => {
    const graph = createMinimalGraph({
      components: [
        parseNode({
          sourceLocation: testSourceLocation,
          id: 'n1',
          type: 'API',
          name: 'API 1',
          domain: 'orders',
          module: 'm1' 
        }),
        parseNode({
          sourceLocation: testSourceLocation,
          id: 'n2',
          type: 'UseCase',
          name: 'UC 1',
          domain: 'payments',
          module: 'm2' 
        }),
      ],
      links: [
        parseEdge({
          source: 'n1',
          target: 'n2',
          type: 'sync' 
        }),
        parseEdge({
          source: 'n1',
          target: 'n2',
          type: 'async' 
        }),
      ],
    })

    const result = extractDomainMap(graph)

    const ids = result.domainEdges.map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('includes label with API count', () => {
    const graph = createMinimalGraph({
      components: [
        parseNode({
          sourceLocation: testSourceLocation,
          id: 'n1',
          type: 'UseCase',
          name: 'UC 1',
          domain: 'orders',
          module: 'm1' 
        }),
        parseNode({
          sourceLocation: testSourceLocation,
          id: 'n2',
          type: 'API',
          name: 'API 1',
          domain: 'payments',
          module: 'm2',
          httpMethod: 'POST',
          path: '/api' 
        }),
      ],
      links: [parseEdge({
        source: 'n1',
        target: 'n2',
        type: 'sync' 
      })],
    })

    const result = extractDomainMap(graph)

    expect(result.domainEdges[0]?.label).toBe('1 API')
  })

  it('includes label with event count', () => {
    const graph = createMinimalGraph({
      components: [
        parseNode({
          sourceLocation: testSourceLocation,
          id: 'n1',
          type: 'Event',
          name: 'Ev 1',
          domain: 'orders',
          module: 'm1',
          eventName: 'Ev1' 
        }),
        parseNode({
          sourceLocation: testSourceLocation,
          id: 'n2',
          type: 'EventHandler',
          name: 'EH 1',
          domain: 'payments',
          module: 'm2',
          subscribedEvents: ['Ev1'] 
        }),
      ],
      links: [parseEdge({
        source: 'n1',
        target: 'n2',
        type: 'async' 
      })],
    })

    const result = extractDomainMap(graph)

    expect(result.domainEdges[0]?.label).toBe('1 Event')
  })

  it('includes combined label with both API and event counts', () => {
    const graph = createMinimalGraph({
      components: [
        parseNode({
          sourceLocation: testSourceLocation,
          id: 'n1',
          type: 'UseCase',
          name: 'UC 1',
          domain: 'orders',
          module: 'm1' 
        }),
        parseNode({
          sourceLocation: testSourceLocation,
          id: 'n2',
          type: 'API',
          name: 'API 1',
          domain: 'payments',
          module: 'm2',
          httpMethod: 'POST',
          path: '/api' 
        }),
        parseNode({
          sourceLocation: testSourceLocation,
          id: 'n3',
          type: 'EventHandler',
          name: 'EH 1',
          domain: 'payments',
          module: 'm2',
          subscribedEvents: ['SomeEvent'] 
        }),
      ],
      links: [
        parseEdge({
          source: 'n1',
          target: 'n2',
          type: 'sync' 
        }),
        parseEdge({
          source: 'n1',
          target: 'n3',
          type: 'async' 
        }),
      ],
    })

    const result = extractDomainMap(graph)

    expect(result.domainEdges[0]?.label).toBe('1 API · 1 Event')
  })

  it('uses cyan style for API-only edges', () => {
    const graph = createMinimalGraph({
      components: [
        parseNode({
          sourceLocation: testSourceLocation,
          id: 'n1',
          type: 'UseCase',
          name: 'UC 1',
          domain: 'orders',
          module: 'm1' 
        }),
        parseNode({
          sourceLocation: testSourceLocation,
          id: 'n2',
          type: 'API',
          name: 'API 1',
          domain: 'payments',
          module: 'm2',
          httpMethod: 'POST',
          path: '/api' 
        }),
      ],
      links: [parseEdge({
        source: 'n1',
        target: 'n2',
        type: 'sync' 
      })],
    })

    const result = extractDomainMap(graph)

    expect(result.domainEdges[0]?.style?.stroke).toBe('#06B6D4')
    expect(result.domainEdges[0]?.markerEnd).toBe('url(#arrow-cyan)')
  })

  it('uses amber style for event-only edges', () => {
    const graph = createMinimalGraph({
      components: [
        parseNode({
          sourceLocation: testSourceLocation,
          id: 'n1',
          type: 'Event',
          name: 'Ev 1',
          domain: 'orders',
          module: 'm1',
          eventName: 'Ev1' 
        }),
        parseNode({
          sourceLocation: testSourceLocation,
          id: 'n2',
          type: 'EventHandler',
          name: 'EH 1',
          domain: 'payments',
          module: 'm2',
          subscribedEvents: ['Ev1'] 
        }),
      ],
      links: [parseEdge({
        source: 'n1',
        target: 'n2',
        type: 'async' 
      })],
    })

    const result = extractDomainMap(graph)

    expect(result.domainEdges[0]?.style?.stroke).toBe('#F59E0B')
    expect(result.domainEdges[0]?.markerEnd).toBe('url(#arrow-amber)')
  })

  it('uses cyan style for mixed edges (API takes precedence)', () => {
    const graph = createMinimalGraph({
      components: [
        parseNode({
          sourceLocation: testSourceLocation,
          id: 'n1',
          type: 'UseCase',
          name: 'UC 1',
          domain: 'orders',
          module: 'm1' 
        }),
        parseNode({
          sourceLocation: testSourceLocation,
          id: 'n2',
          type: 'API',
          name: 'API 1',
          domain: 'payments',
          module: 'm2',
          httpMethod: 'POST',
          path: '/api' 
        }),
        parseNode({
          sourceLocation: testSourceLocation,
          id: 'n3',
          type: 'EventHandler',
          name: 'EH 1',
          domain: 'payments',
          module: 'm2',
          subscribedEvents: ['SomeEvent'] 
        }),
      ],
      links: [
        parseEdge({
          source: 'n1',
          target: 'n2',
          type: 'sync' 
        }),
        parseEdge({
          source: 'n1',
          target: 'n3',
          type: 'async' 
        }),
      ],
    })

    const result = extractDomainMap(graph)

    expect(result.domainEdges[0]?.style?.stroke).toBe('#06B6D4')
  })

  it('includes connection details with source and target node names', () => {
    const graph = createMinimalGraph({
      components: [
        parseNode({
          sourceLocation: testSourceLocation,
          id: 'n1',
          type: 'API',
          name: 'PlaceOrder',
          domain: 'orders',
          module: 'm1' 
        }),
        parseNode({
          sourceLocation: testSourceLocation,
          id: 'n2',
          type: 'UseCase',
          name: 'ProcessPayment',
          domain: 'payments',
          module: 'm2' 
        }),
      ],
      links: [parseEdge({
        source: 'n1',
        target: 'n2',
        type: 'sync' 
      })],
    })

    const result = extractDomainMap(graph)

    expect(result.domainEdges[0]?.data?.connections).toEqual([
      {
        sourceName: 'PlaceOrder',
        targetName: 'ProcessPayment',
        type: 'sync',
        targetNodeType: 'UseCase' 
      },
    ])
  })

  it('collects multiple connections between same domains', () => {
    const graph = createMinimalGraph({
      components: [
        parseNode({
          sourceLocation: testSourceLocation,
          id: 'n1',
          type: 'API',
          name: 'PlaceOrder',
          domain: 'orders',
          module: 'm1' 
        }),
        parseNode({
          sourceLocation: testSourceLocation,
          id: 'n2',
          type: 'Event',
          name: 'OrderCreated',
          domain: 'orders',
          module: 'm1',
          eventName: 'OrderCreated' 
        }),
        parseNode({
          sourceLocation: testSourceLocation,
          id: 'n3',
          type: 'UseCase',
          name: 'ProcessPayment',
          domain: 'payments',
          module: 'm2' 
        }),
        parseNode({
          sourceLocation: testSourceLocation,
          id: 'n4',
          type: 'EventHandler',
          name: 'HandleOrderCreated',
          domain: 'payments',
          module: 'm2',
          subscribedEvents: ['OrderCreated'] 
        }),
      ],
      links: [
        parseEdge({
          source: 'n1',
          target: 'n3',
          type: 'sync' 
        }),
        parseEdge({
          source: 'n2',
          target: 'n4',
          type: 'async' 
        }),
      ],
    })

    const result = extractDomainMap(graph)

    expect(result.domainEdges[0]?.data?.connections).toHaveLength(2)
    expect(result.domainEdges[0]?.data?.connections).toContainEqual({
      sourceName: 'PlaceOrder',
      targetName: 'ProcessPayment',
      type: 'sync',
      targetNodeType: 'UseCase',
    })
    expect(result.domainEdges[0]?.data?.connections).toContainEqual({
      sourceName: 'OrderCreated',
      targetName: 'HandleOrderCreated',
      type: 'async',
      targetNodeType: 'EventHandler',
    })
  })
})
