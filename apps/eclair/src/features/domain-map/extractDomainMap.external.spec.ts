import {
  describe, it, expect 
} from 'vitest'
import { extractDomainMap } from './extractDomainMap'
import type { RiviereGraph } from '@/types/riviere'
import {
  parseNode, parseDomainMetadata 
} from '@/lib/riviereTestFixtures'

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

describe('extractDomainMap external links integration', () => {
  it('creates individual node for each external system', () => {
    const sourceNodeId = parseNode({
      sourceLocation: testSourceLocation,
      id: 'n1',
      type: 'API',
      name: 'API 1',
      domain: 'orders',
      module: 'm1',
    }).id

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
      externalLinks: [
        {
          source: sourceNodeId,
          target: { name: 'Stripe' },
          type: 'sync',
        },
        {
          source: sourceNodeId,
          target: { name: 'Twilio' },
          type: 'sync',
        },
      ],
    })

    const result = extractDomainMap(graph)

    const stripeNode = result.domainNodes.find((n) => n.id === 'external:Stripe')
    const twilioNode = result.domainNodes.find((n) => n.id === 'external:Twilio')
    expect(stripeNode).toBeDefined()
    expect(stripeNode?.data.label).toBe('Stripe')
    expect(stripeNode?.data.isExternal).toBe(true)
    expect(twilioNode).toBeDefined()
    expect(twilioNode?.data.label).toBe('Twilio')
    expect(twilioNode?.data.isExternal).toBe(true)
  })

  it('does not create external nodes when no externalLinks', () => {
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

    const externalNodes = result.domainNodes.filter((n) => n.id.startsWith('external:'))
    expect(externalNodes).toHaveLength(0)
  })

  it('creates edge from source domain to specific external system', () => {
    const sourceNodeId = parseNode({
      sourceLocation: testSourceLocation,
      id: 'n1',
      type: 'API',
      name: 'API 1',
      domain: 'orders',
      module: 'm1',
    }).id

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
      externalLinks: [
        {
          source: sourceNodeId,
          target: { name: 'Stripe' },
          type: 'sync',
        },
      ],
    })

    const result = extractDomainMap(graph)

    const stripeEdge = result.domainEdges.find((e) => e.target === 'external:Stripe')
    expect(stripeEdge).toBeDefined()
    expect(stripeEdge?.source).toBe('orders')
  })

  it('counts connections per external system', () => {
    const node1Id = parseNode({
      sourceLocation: testSourceLocation,
      id: 'n1',
      type: 'API',
      name: 'API 1',
      domain: 'orders',
      module: 'm1',
    }).id
    const node2Id = parseNode({
      sourceLocation: testSourceLocation,
      id: 'n2',
      type: 'UseCase',
      name: 'UC 1',
      domain: 'orders',
      module: 'm1',
    }).id

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
      externalLinks: [
        {
          source: node1Id,
          target: { name: 'Stripe' },
          type: 'sync',
        },
        {
          source: node2Id,
          target: { name: 'Stripe' },
          type: 'sync',
        },
      ],
    })

    const result = extractDomainMap(graph)

    const stripeNode = result.domainNodes.find((n) => n.id === 'external:Stripe')
    expect(stripeNode?.data.nodeCount).toBe(2)
  })

  it('marks internal domain nodes as not external', () => {
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

    const ordersNode = result.domainNodes.find((n) => n.id === 'orders')
    expect(ordersNode?.data.isExternal).toBe(false)
  })
})
