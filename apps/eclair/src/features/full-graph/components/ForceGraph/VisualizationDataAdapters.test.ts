import {
  describe, it, expect 
} from 'vitest'
import {
  createSimulationNodes,
  createSimulationLinks,
  createExternalNodes,
  createExternalLinks,
  createLayoutEdges,
  isAsyncEdge,
  truncateName,
  getNodeColor,
  getNodeRadius,
  getEdgeColor,
  getSemanticEdgeType,
  getSemanticEdgeColor,
  getDomainColor,
} from './VisualizationDataAdapters'
import type {
  Node, Edge, ExternalLink 
} from '@/types/riviere'
import {
  parseNode, parseEdge, parseNodeId 
} from '@/lib/riviereTestFixtures'
const testSourceLocation = {
  repository: 'test-repo',
  filePath: 'src/test.ts',
}

describe('VisualizationDataAdapters', () => {
  describe('createSimulationNodes', () => {
    it('transforms nodes into simulation nodes', () => {
      const nodes: Node[] = [
        parseNode({
          sourceLocation: testSourceLocation,
          id: '1',
          type: 'API',
          name: 'Test API',
          domain: 'test',
          module: 'test-module',
        }),
      ]

      const result = createSimulationNodes(nodes)

      expect(result).toHaveLength(1)
      expect(result[0]?.id).toBe('1')
      expect(result[0]?.type).toBe('API')
      expect(result[0]?.name).toBe('Test API')
      expect(result[0]?.domain).toBe('test')
      expect(result[0]?.originalNode).toBeDefined()
    })
  })

  describe('createSimulationLinks', () => {
    it('transforms edges into simulation links', () => {
      const edges: Edge[] = [
        parseEdge({
          source: '1',
          target: '2',
          type: 'sync',
        }),
      ]

      const result = createSimulationLinks(edges)

      expect(result).toHaveLength(1)
      expect(result[0]?.source).toBe('1')
      expect(result[0]?.target).toBe('2')
      expect(result[0]?.type).toBe('sync')
      expect(result[0]?.originalEdge).toBeDefined()
    })
  })

  describe('isAsyncEdge', () => {
    it('returns true for async edge type', () => {
      expect(isAsyncEdge('async')).toBe(true)
    })

    it('returns false for unknown edge type', () => {
      expect(isAsyncEdge('unknown')).toBe(false)
    })

    it('returns false for sync edge type', () => {
      expect(isAsyncEdge('sync')).toBe(false)
    })

    it('returns false for undefined flow type', () => {
      expect(isAsyncEdge(undefined)).toBe(false)
    })
  })

  describe('truncateName', () => {
    it('returns name unchanged when shorter than max length', () => {
      expect(truncateName('Short', 20)).toBe('Short')
    })

    it('truncates and appends ellipsis when longer than max length', () => {
      expect(truncateName('VeryLongName', 8)).toBe('VeryLo...')
    })

    it('handles edge case of max length', () => {
      expect(truncateName('Hello', 5)).toBe('Hello')
    })
  })

  describe('getNodeColor', () => {
    it('returns correct color for API node in stream theme', () => {
      const color = getNodeColor('API', 'stream')
      expect(typeof color).toBe('string')
      expect(color).toBeTruthy()
    })

    it('returns correct color for UseCase node in voltage theme', () => {
      const color = getNodeColor('UseCase', 'voltage')
      expect(typeof color).toBe('string')
      expect(color).toBeTruthy()
    })

    it('returns distinct colors for different node types', () => {
      const apiColor = getNodeColor('API', 'stream')
      const useCaseColor = getNodeColor('UseCase', 'stream')
      expect(apiColor).not.toBe(useCaseColor)
    })

    it('returns same color for same type and theme', () => {
      const color1 = getNodeColor('Event', 'stream')
      const color2 = getNodeColor('Event', 'stream')
      expect(color1).toBe(color2)
    })
  })

  describe('getNodeRadius', () => {
    it('returns numeric radius for API nodes', () => {
      const radius = getNodeRadius('API')
      expect(typeof radius).toBe('number')
      expect(radius).toBeGreaterThan(0)
    })

    it('returns radius for all node types', () => {
      const types: Array<
        'API' | 'UseCase' | 'Event' | 'EventHandler' | 'DomainOp' | 'UI' | 'Custom'
      > = ['API', 'UseCase', 'Event', 'EventHandler', 'DomainOp', 'UI', 'Custom']

      types.forEach((type) => {
        const radius = getNodeRadius(type)
        expect(typeof radius).toBe('number')
        expect(radius).toBeGreaterThan(0)
      })
    })
  })

  describe('getEdgeColor', () => {
    it('returns async color for async flow type', () => {
      const color = getEdgeColor('async', 'stream')
      expect(typeof color).toBe('string')
      expect(color).toBeTruthy()
    })

    it('returns sync color for unknown flow type', () => {
      const color = getEdgeColor('unknown', 'stream')
      expect(typeof color).toBe('string')
      expect(color).toBeTruthy()
    })

    it('returns sync color for sync flow type', () => {
      const color = getEdgeColor('sync', 'stream')
      expect(typeof color).toBe('string')
      expect(color).toBeTruthy()
    })

    it('returns sync color for undefined flow type', () => {
      const color = getEdgeColor(undefined, 'stream')
      expect(typeof color).toBe('string')
      expect(color).toBeTruthy()
    })

    it('returns different colors for async and sync', () => {
      const asyncColor = getEdgeColor('async', 'stream')
      const syncColor = getEdgeColor('sync', 'stream')
      expect(asyncColor).not.toBe(syncColor)
    })

    it('returns same color for same flow type and theme', () => {
      const color1 = getEdgeColor('sync', 'stream')
      const color2 = getEdgeColor('sync', 'stream')
      expect(color1).toBe(color2)
    })

    it('respects theme parameter', () => {
      const streamColor = getEdgeColor('sync', 'stream')
      const voltageColor = getEdgeColor('sync', 'voltage')
      expect(streamColor).not.toBe(voltageColor)
    })
  })

  describe('getDomainColor', () => {
    it('returns a string color', () => {
      const color = getDomainColor('orders', ['orders', 'shipping'])
      expect(typeof color).toBe('string')
      expect(color).toBeTruthy()
    })

    it('returns consistent color for same domain', () => {
      const color1 = getDomainColor('orders', ['orders', 'shipping'])
      const color2 = getDomainColor('orders', ['orders', 'shipping'])
      expect(color1).toBe(color2)
    })

    it('handles single domain in list', () => {
      const color = getDomainColor('orders', ['orders'])
      expect(typeof color).toBe('string')
      expect(color).toBeTruthy()
    })

    it('handles multiple domains in list', () => {
      const domains = ['orders', 'shipping', 'inventory', 'payments']
      domains.forEach((domain) => {
        const color = getDomainColor(domain, domains)
        expect(typeof color).toBe('string')
        expect(color).toBeTruthy()
      })
    })
  })

  describe('createExternalNodes', () => {
    it('creates simulation nodes for external link targets', () => {
      const externalLinks: ExternalLink[] = [
        {
          source: parseNodeId('payment:usecase:processpayment'),
          target: {
            name: 'Stripe',
            url: 'https://api.stripe.com',
          },
          type: 'sync',
          description: 'Process payment via Stripe',
        },
      ]

      const result = createExternalNodes(externalLinks)

      expect(result).toHaveLength(1)
      expect(result[0]?.id).toBe('external:Stripe')
      expect(result[0]?.type).toBe('External')
      expect(result[0]?.name).toBe('Stripe')
      expect(result[0]?.domain).toBe('external')
      expect(result[0]?.originalNode).toBeDefined()
      expect(result[0]?.originalNode.id).toBe('external:Stripe')
      expect(result[0]?.originalNode.type).toBe('External')
      expect(result[0]?.originalNode.name).toBe('Stripe')
    })

    it('deduplicates external nodes with same name', () => {
      const externalLinks: ExternalLink[] = [
        {
          source: parseNodeId('payment:usecase:processpayment'),
          target: {
            name: 'Stripe',
            url: 'https://api.stripe.com',
          },
          type: 'sync',
        },
        {
          source: parseNodeId('payment:usecase:refundpayment'),
          target: {
            name: 'Stripe',
            url: 'https://api.stripe.com',
          },
          type: 'sync',
        },
      ]

      const result = createExternalNodes(externalLinks)

      expect(result).toHaveLength(1)
      expect(result[0]?.name).toBe('Stripe')
    })

    it('returns empty array for undefined external links', () => {
      const result = createExternalNodes(undefined)
      expect(result).toHaveLength(0)
    })
  })

  describe('createExternalLinks', () => {
    it('creates simulation links from source to external target', () => {
      const externalLinks: ExternalLink[] = [
        {
          source: parseNodeId('payment:usecase:processpayment'),
          target: {
            name: 'Stripe',
            url: 'https://api.stripe.com',
          },
          type: 'sync',
        },
      ]

      const result = createExternalLinks(externalLinks)

      expect(result).toHaveLength(1)
      expect(result[0]?.source).toBe('payment:usecase:processpayment')
      expect(result[0]?.target).toBe('external:Stripe')
      expect(result[0]?.type).toBe('sync')
      expect(result[0]?.originalEdge).toBeDefined()
      expect(result[0]?.originalEdge.source).toBe('payment:usecase:processpayment')
      expect(result[0]?.originalEdge.target).toBe('external:Stripe')
    })

    it('creates multiple links for same external target', () => {
      const externalLinks: ExternalLink[] = [
        {
          source: parseNodeId('payment:usecase:processpayment'),
          target: {
            name: 'Stripe',
            url: 'https://api.stripe.com',
          },
          type: 'sync',
        },
        {
          source: parseNodeId('payment:usecase:refundpayment'),
          target: {
            name: 'Stripe',
            url: 'https://api.stripe.com',
          },
          type: 'sync',
        },
      ]

      const result = createExternalLinks(externalLinks)

      expect(result).toHaveLength(2)
      expect(result[0]?.source).toBe('payment:usecase:processpayment')
      expect(result[1]?.source).toBe('payment:usecase:refundpayment')
    })

    it('returns empty array for undefined external links', () => {
      const result = createExternalLinks(undefined)
      expect(result).toHaveLength(0)
    })
  })

  describe('getNodeColor for External nodes', () => {
    it('returns color for External node type', () => {
      const color = getNodeColor('External', 'stream')
      expect(typeof color).toBe('string')
      expect(color).toBeTruthy()
    })
  })

  describe('getNodeRadius for External nodes', () => {
    it('returns radius for External node type', () => {
      const radius = getNodeRadius('External')
      expect(typeof radius).toBe('number')
      expect(radius).toBeGreaterThan(0)
    })
  })

  describe('getSemanticEdgeType', () => {
    it('returns event for edge targeting Event node', () => {
      expect(getSemanticEdgeType('UseCase', 'Event')).toBe('event')
      expect(getSemanticEdgeType('DomainOp', 'Event')).toBe('event')
    })

    it('returns default for edge from EventHandler node (not special anymore)', () => {
      expect(getSemanticEdgeType('EventHandler', 'UseCase')).toBe('default')
      expect(getSemanticEdgeType('EventHandler', 'DomainOp')).toBe('default')
    })

    it('returns default for edge targeting External node (not special anymore)', () => {
      expect(getSemanticEdgeType('UseCase', 'External')).toBe('default')
      expect(getSemanticEdgeType('API', 'External')).toBe('default')
    })

    it('returns default for standard edges', () => {
      expect(getSemanticEdgeType('API', 'UseCase')).toBe('default')
      expect(getSemanticEdgeType('UseCase', 'DomainOp')).toBe('default')
      expect(getSemanticEdgeType('UI', 'API')).toBe('default')
    })

    it('returns event when target is Event even from EventHandler', () => {
      expect(getSemanticEdgeType('EventHandler', 'Event')).toBe('event')
    })
  })

  describe('getSemanticEdgeColor', () => {
    it('returns brand-compliant event color for edge targeting Event node', () => {
      expect(getSemanticEdgeColor('UseCase', 'Event', 'stream')).toBe('#FF6B6B')
      expect(getSemanticEdgeColor('UseCase', 'Event', 'voltage')).toBe('#39FF14')
      expect(getSemanticEdgeColor('UseCase', 'Event', 'circuit')).toBe('#1A7F37')
    })

    it('returns default color for edge from EventHandler node (not special)', () => {
      expect(getSemanticEdgeColor('EventHandler', 'UseCase', 'stream')).toBe('#0D9488')
    })

    it('returns default color for edge targeting External node (not special)', () => {
      expect(getSemanticEdgeColor('UseCase', 'External', 'stream')).toBe('#0D9488')
    })

    it('returns brand-compliant default color for standard edges', () => {
      expect(getSemanticEdgeColor('API', 'UseCase', 'stream')).toBe('#0D9488')
      expect(getSemanticEdgeColor('API', 'UseCase', 'voltage')).toBe('#00D4FF')
      expect(getSemanticEdgeColor('API', 'UseCase', 'circuit')).toBe('#0969DA')
    })

    it('respects theme parameter', () => {
      const streamColor = getSemanticEdgeColor('UseCase', 'Event', 'stream')
      const voltageColor = getSemanticEdgeColor('UseCase', 'Event', 'voltage')
      expect(streamColor).not.toBe(voltageColor)
    })
  })

  describe('createLayoutEdges', () => {
    it('includes internal edges in layout', () => {
      const internalEdges: Edge[] = [
        parseEdge({
          source: 'a',
          target: 'b',
          type: 'sync',
        }),
      ]

      const result = createLayoutEdges(internalEdges, undefined)

      expect(result).toEqual([
        {
          source: 'a',
          target: 'b',
        },
      ])
    })

    it('includes external links as edges in layout', () => {
      const internalEdges: Edge[] = [
        parseEdge({
          source: 'a',
          target: 'b',
          type: 'sync',
        }),
      ]
      const externalLinks: ExternalLink[] = [
        {
          source: 'b',
          target: {
            name: 'Stripe',
            url: 'https://api.stripe.com',
          },
          type: 'sync',
        },
      ]

      const result = createLayoutEdges(internalEdges, externalLinks)

      expect(result).toEqual([
        {
          source: 'a',
          target: 'b',
        },
        {
          source: 'b',
          target: 'external:Stripe',
        },
      ])
    })

    it('creates multiple edges for multiple external links', () => {
      const internalEdges: Edge[] = []
      const externalLinks: ExternalLink[] = [
        {
          source: 'a',
          target: {
            name: 'Stripe',
            url: 'https://api.stripe.com',
          },
          type: 'sync',
        },
        {
          source: 'b',
          target: {
            name: 'Stripe',
            url: 'https://api.stripe.com',
          },
          type: 'sync',
        },
      ]

      const result = createLayoutEdges(internalEdges, externalLinks)

      expect(result).toHaveLength(2)
      expect(result).toContainEqual({
        source: 'a',
        target: 'external:Stripe',
      })
      expect(result).toContainEqual({
        source: 'b',
        target: 'external:Stripe',
      })
    })
  })
})
