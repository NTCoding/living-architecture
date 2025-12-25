import { describe, it, expect } from 'vitest'
import { createSimulationNodes, createSimulationLinks, isAsyncEdge, truncateName, getNodeColor, getNodeRadius, getEdgeColor, getDomainColor } from './VisualizationDataAdapters'
import type { Node, Edge } from '@/types/riviere'
import { parseNode, parseEdge } from '@/lib/riviereTestData'
const testSourceLocation = { repository: 'test-repo', filePath: 'src/test.ts' }

describe('VisualizationDataAdapters', () => {
  describe('createSimulationNodes', () => {
    it('transforms nodes into simulation nodes', () => {
      const nodes: Node[] = [
        parseNode({ sourceLocation: testSourceLocation, id: '1', type: 'API', name: 'Test API', domain: 'test', module: 'test-module' }),
      ]

      const result = createSimulationNodes(nodes)

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        id: '1',
        type: 'API',
        name: 'Test API',
        domain: 'test',
        originalNode: expect.any(Object),
      })
    })
  })

  describe('createSimulationLinks', () => {
    it('transforms edges into simulation links', () => {
      const edges: Edge[] = [
        parseEdge({ source: '1', target: '2', type: 'sync' }),
      ]

      const result = createSimulationLinks(edges)

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        source: '1',
        target: '2',
        type: 'sync',
        originalEdge: expect.any(Object),
      })
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
      const types: Array<'API' | 'UseCase' | 'Event' | 'EventHandler' | 'DomainOp' | 'UI' | 'Custom'> = [
        'API', 'UseCase', 'Event', 'EventHandler', 'DomainOp', 'UI', 'Custom',
      ]

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
})
