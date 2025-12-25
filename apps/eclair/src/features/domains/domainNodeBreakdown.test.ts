import { describe, it, expect } from 'vitest'
import {
  countNodesByType,
  formatDomainNodes,
  extractEntities,
  extractEntryPoints,
  type NodeBreakdown,
} from './domainNodeBreakdown'
import { parseNode } from '@/lib/riviereTestData'
import type { SourceLocation } from '@/types/riviere'
import type { RawNode } from '@/lib/riviereTestData'
const testSourceLocation = { repository: 'test-repo', filePath: 'src/test.ts' }

function createNode(overrides: Partial<RawNode> = {}): ReturnType<typeof parseNode> {
  return parseNode({ sourceLocation: testSourceLocation,     id: 'node-1',
    type: 'API',
    name: 'Test Node',
    domain: 'test-domain',
    module: 'test-module',
    ...overrides,
  })
}

describe('domainNodeBreakdown', () => {
  describe('countNodesByType', () => {
    it('returns zero counts for all types with empty array', () => {
      const result = countNodesByType([])

      const expected: NodeBreakdown = {
        UI: 0,
        API: 0,
        UseCase: 0,
        DomainOp: 0,
        Event: 0,
        EventHandler: 0,
        Custom: 0,
      }
      expect(result).toEqual(expected)
    })

    it('counts single node of each type', () => {
      const nodes = [
        createNode({ id: 'ui-1', type: 'UI', route: '/test' }),
        createNode({ id: 'api-1', type: 'API' }),
        createNode({ id: 'uc-1', type: 'UseCase' }),
        createNode({ id: 'op-1', type: 'DomainOp', operationName: 'test' }),
        createNode({ id: 'event-1', type: 'Event', eventName: 'TestEvent' }),
        createNode({ id: 'handler-1', type: 'EventHandler', subscribedEvents: ['TestEvent'] }),
        createNode({ id: 'custom-1', type: 'Custom' }),
      ]

      const result = countNodesByType(nodes)

      expect(result.UI).toBe(1)
      expect(result.API).toBe(1)
      expect(result.UseCase).toBe(1)
      expect(result.DomainOp).toBe(1)
      expect(result.Event).toBe(1)
      expect(result.EventHandler).toBe(1)
      expect(result.Custom).toBe(1)
    })

    it('counts multiple nodes of same type', () => {
      const nodes = [
        createNode({ id: 'api-1', type: 'API' }),
        createNode({ id: 'api-2', type: 'API' }),
        createNode({ id: 'api-3', type: 'API' }),
      ]

      const result = countNodesByType(nodes)

      expect(result.API).toBe(3)
      expect(result.UI).toBe(0)
    })

    it('handles mixed node types', () => {
      const nodes = [
        createNode({ id: 'ui-1', type: 'UI', route: '/test' }),
        createNode({ id: 'api-1', type: 'API' }),
        createNode({ id: 'api-2', type: 'API' }),
        createNode({ id: 'event-1', type: 'Event', eventName: 'TestEvent' }),
        createNode({ id: 'handler-1', type: 'EventHandler', subscribedEvents: ['TestEvent'] }),
      ]

      const result = countNodesByType(nodes)

      expect(result.UI).toBe(1)
      expect(result.API).toBe(2)
      expect(result.Event).toBe(1)
      expect(result.EventHandler).toBe(1)
      expect(result.UseCase).toBe(0)
    })
  })

  describe('formatDomainNodes', () => {
    it('formats location as "filePath:lineNumber"', () => {
      const nodes = [
        createNode({
          id: 'api-1',
          type: 'API',
          sourceLocation: { repository: 'test-repo', filePath: 'src/api/orders.ts', lineNumber: 42 },
        }),
      ]

      const result = formatDomainNodes(nodes)

      expect(result[0]?.location).toBe('src/api/orders.ts:42')
    })

    it('handles nodes without sourceLocation', () => {
      const rawNode: RawNode = {
        id: 'api-1',
        type: 'API',
        name: 'Test Node',
        domain: 'test-domain',
        module: 'test-module',
        sourceLocation: { repository: 'test-repo', filePath: '' },
      }
      const nodes = [parseNode(rawNode)]

      const result = formatDomainNodes(nodes)

      expect(result[0]?.location).toBe('')
    })

    it('handles sourceLocation without lineNumber', () => {
      const nodes = [
        createNode({
          id: 'api-1',
          type: 'API',
          sourceLocation: { repository: 'test-repo', filePath: 'src/api/orders.ts' },
        }),
      ]

      const result = formatDomainNodes(nodes)

      expect(result[0]?.location).toBe('src/api/orders.ts')
    })

    it('sorts by type priority (UI, API, UseCase, DomainOp, Event, EventHandler, Custom)', () => {
      const nodes = [
        createNode({ id: 'handler-1', type: 'EventHandler', subscribedEvents: ['TestEvent'] }),
        createNode({ id: 'api-1', type: 'API' }),
        createNode({ id: 'ui-1', type: 'UI', route: '/test' }),
        createNode({ id: 'event-1', type: 'Event', eventName: 'TestEvent' }),
        createNode({ id: 'uc-1', type: 'UseCase' }),
        createNode({ id: 'op-1', type: 'DomainOp', operationName: 'test' }),
        createNode({ id: 'custom-1', type: 'Custom' }),
      ]

      const result = formatDomainNodes(nodes)

      expect(result[0]?.type).toBe('UI')
      expect(result[1]?.type).toBe('API')
      expect(result[2]?.type).toBe('UseCase')
      expect(result[3]?.type).toBe('DomainOp')
      expect(result[4]?.type).toBe('Event')
      expect(result[5]?.type).toBe('EventHandler')
      expect(result[6]?.type).toBe('Custom')
    })

    it('preserves node id, type, name, and sourceLocation', () => {
      const sourceLocation: SourceLocation = { repository: 'test-repo', filePath: 'src/test.ts', lineNumber: 10 }
      const nodes = [
        createNode({
          id: 'api-123',
          type: 'API',
          name: 'Test API',
          sourceLocation,
        }),
      ]

      const result = formatDomainNodes(nodes)

      expect(result[0]?.id).toBe('api-123')
      expect(result[0]?.type).toBe('API')
      expect(result[0]?.name).toBe('Test API')
      expect(result[0]?.sourceLocation).toBe(sourceLocation)
    })

    it('returns empty array for empty input', () => {
      const result = formatDomainNodes([])

      expect(result).toEqual([])
    })
  })

  describe('extractEntities', () => {
    it('groups DomainOp nodes by entity name', () => {
      const nodes = [
        createNode({
          id: 'op-1',
          type: 'DomainOp',
          entity: 'Order',
          operationName: 'begin',
          name: 'Order.begin',
        }),
        createNode({
          id: 'op-2',
          type: 'DomainOp',
          entity: 'Order',
          operationName: 'complete',
          name: 'Order.complete',
        }),
      ]

      const result = extractEntities(nodes)

      expect(result).toHaveLength(1)
      expect(result[0]?.name).toBe('Order')
      expect(result[0]?.operations).toContain('begin')
      expect(result[0]?.operations).toContain('complete')
    })

    it('collects operation details for each entity', () => {
      const sourceLocation: SourceLocation = { repository: 'test-repo', filePath: 'src/Order.ts', lineNumber: 20 }
      const nodes = [
        createNode({
          id: 'op-1',
          type: 'DomainOp',
          entity: 'Order',
          operationName: 'begin',
          name: 'Order.begin',
          sourceLocation,
        }),
      ]

      const result = extractEntities(nodes)

      expect(result[0]?.operationDetails).toHaveLength(1)
      expect(result[0]?.operationDetails[0]).toEqual({
        id: 'op-1',
        operationName: 'begin',
        name: 'Order.begin',
        behavior: undefined,
        stateChanges: undefined,
        signature: undefined,
        sourceLocation,
      })
    })

    it('sorts entities alphabetically', () => {
      const nodes = [
        createNode({ id: 'op-1', type: 'DomainOp', entity: 'Zebra', operationName: 'op1', name: 'Z' }),
        createNode({ id: 'op-2', type: 'DomainOp', entity: 'Apple', operationName: 'op1', name: 'A' }),
        createNode({ id: 'op-3', type: 'DomainOp', entity: 'Monkey', operationName: 'op1', name: 'M' }),
      ]

      const result = extractEntities(nodes)

      expect(result[0]?.name).toBe('Apple')
      expect(result[1]?.name).toBe('Monkey')
      expect(result[2]?.name).toBe('Zebra')
    })

    it('sorts operations alphabetically within each entity', () => {
      const nodes = [
        createNode({
          id: 'op-1',
          type: 'DomainOp',
          entity: 'Order',
          operationName: 'zebra',
          name: 'Z',
        }),
        createNode({
          id: 'op-2',
          type: 'DomainOp',
          entity: 'Order',
          operationName: 'apple',
          name: 'A',
        }),
      ]

      const result = extractEntities(nodes)

      expect(result[0]?.operationDetails[0]?.operationName).toBe('apple')
      expect(result[0]?.operationDetails[1]?.operationName).toBe('zebra')
    })

    it('uses first encountered sourceLocation as entity sourceLocation', () => {
      const loc1: SourceLocation = { repository: 'test-repo', filePath: 'src/Order.ts', lineNumber: 20 }
      const loc2: SourceLocation = { repository: 'test-repo', filePath: 'src/Order.ts', lineNumber: 40 }
      const nodes = [
        createNode({
          id: 'op-1',
          type: 'DomainOp',
          entity: 'Order',
          operationName: 'begin',
          name: 'Order.begin',
          sourceLocation: loc1,
        }),
        createNode({
          id: 'op-2',
          type: 'DomainOp',
          entity: 'Order',
          operationName: 'complete',
          name: 'Order.complete',
          sourceLocation: loc2,
        }),
      ]

      const result = extractEntities(nodes)

      expect(result[0]?.sourceLocation).toBe(loc1)
    })

    it('returns empty array when no DomainOp nodes', () => {
      const nodes = [
        createNode({ id: 'api-1', type: 'API' }),
        createNode({ id: 'uc-1', type: 'UseCase' }),
      ]

      const result = extractEntities(nodes)

      expect(result).toEqual([])
    })

    it('ignores non-DomainOp nodes', () => {
      const nodes = [
        createNode({ id: 'api-1', type: 'API', entity: 'Order' }),
        createNode({
          id: 'op-1',
          type: 'DomainOp',
          entity: 'Order',
          operationName: 'begin',
          name: 'Order.begin',
        }),
      ]

      const result = extractEntities(nodes)

      expect(result).toHaveLength(1)
      expect(result[0]?.name).toBe('Order')
    })

    it('skips DomainOp nodes without entity for entity extraction', () => {
      const nodes = [
        createNode({
          id: 'op-1',
          type: 'DomainOp',
          operationName: 'begin',
          name: 'Something.begin',
        }),
      ]

      const result = extractEntities(nodes)

      expect(result).toEqual([])
    })

    it('extracts DomainOp nodes with entity and operationName', () => {
      const nodes = [
        createNode({
          id: 'op-1',
          type: 'DomainOp',
          entity: 'Order',
          operationName: 'process',
          name: 'Order.process',
        }),
      ]

      const result = extractEntities(nodes)

      expect(result[0]?.name).toBe('Order')
      expect(result[0]?.operations).toEqual(['process'])
    })

    it('collects all states from state changes', () => {
      const nodes = [
        createNode({
          id: 'op-1',
          type: 'DomainOp',
          entity: 'Order',
          operationName: 'begin',
          name: 'Order.begin',
          stateChanges: [{ from: 'initial', to: 'pending' }],
        }),
        createNode({
          id: 'op-2',
          type: 'DomainOp',
          entity: 'Order',
          operationName: 'complete',
          name: 'Order.complete',
          stateChanges: [{ from: 'pending', to: 'completed' }],
        }),
      ]

      const result = extractEntities(nodes)

      expect(result[0]?.allStates).toContain('initial')
      expect(result[0]?.allStates).toContain('pending')
      expect(result[0]?.allStates).toContain('completed')
    })

    it('orders states by following transition chains from initial states', () => {
      const nodes = [
        createNode({
          id: 'op-1',
          type: 'DomainOp',
          entity: 'Order',
          operationName: 'begin',
          name: 'Order.begin',
          stateChanges: [{ from: 'initial', to: 'pending' }],
        }),
        createNode({
          id: 'op-2',
          type: 'DomainOp',
          entity: 'Order',
          operationName: 'complete',
          name: 'Order.complete',
          stateChanges: [{ from: 'pending', to: 'completed' }],
        }),
      ]

      const result = extractEntities(nodes)

      expect(result[0]?.allStates).toEqual(['initial', 'pending', 'completed'])
    })

    it('handles circular state transitions', () => {
      const nodes = [
        createNode({
          id: 'op-1',
          type: 'DomainOp',
          entity: 'Order',
          operationName: 'retry',
          name: 'Order.retry',
          stateChanges: [
            { from: 'initial', to: 'pending' },
            { from: 'pending', to: 'failed' },
            { from: 'failed', to: 'pending' },
          ],
        }),
      ]

      const result = extractEntities(nodes)

      expect(result[0]?.allStates).toContain('initial')
      expect(result[0]?.allStates).toContain('pending')
      expect(result[0]?.allStates).toContain('failed')
    })

    it('handles disconnected state transitions', () => {
      const nodes = [
        createNode({
          id: 'op-1',
          type: 'DomainOp',
          entity: 'Order',
          operationName: 'transition',
          name: 'Order.transition',
          stateChanges: [
            { from: 'initial', to: 'pending' },
            { from: 'archived', to: 'deleted' },
          ],
        }),
      ]

      const result = extractEntities(nodes)

      expect(result[0]?.allStates).toHaveLength(4)
      const entity = result[0]
      if (entity === undefined) {
        throw new Error('Expected entity to exist')
      }
      expect(entity.allStates[0]).toBe('initial')
      expect(entity.allStates[1]).toBe('pending')
      expect(entity.allStates).toContain('archived')
      expect(entity.allStates).toContain('deleted')
    })
  })

  describe('extractEntryPoints', () => {
    it('extracts routes from UI nodes', () => {
      const nodes = [
        createNode({ id: 'ui-1', type: 'UI', route: '/dashboard' }),
        createNode({ id: 'ui-2', type: 'UI', route: '/settings' }),
      ]

      const result = extractEntryPoints(nodes)

      expect(result).toContain('/dashboard')
      expect(result).toContain('/settings')
    })

    it('extracts paths from API nodes', () => {
      const nodes = [
        createNode({ id: 'api-1', type: 'API', path: '/api/users' }),
        createNode({ id: 'api-2', type: 'API', path: '/api/orders' }),
      ]

      const result = extractEntryPoints(nodes)

      expect(result).toContain('/api/users')
      expect(result).toContain('/api/orders')
    })

    it('ignores nodes without path property', () => {
      const nodes = [
        createNode({ id: 'api-1', type: 'API', path: '/api/users' }),
        createNode({ id: 'api-2', type: 'API' }),
      ]

      const result = extractEntryPoints(nodes)

      expect(result).toHaveLength(1)
      expect(result[0]).toBe('/api/users')
    })

    it('ignores non-UI/API nodes', () => {
      const nodes = [
        createNode({ id: 'api-1', type: 'API', path: '/api/users' }),
        createNode({ id: 'uc-1', type: 'UseCase' }),
        createNode({ id: 'op-1', type: 'DomainOp', operationName: 'test' }),
      ]

      const result = extractEntryPoints(nodes)

      expect(result).toEqual(['/api/users'])
    })

    it('returns empty array when no entry points', () => {
      const nodes = [
        createNode({ id: 'uc-1', type: 'UseCase' }),
        createNode({ id: 'op-1', type: 'DomainOp', operationName: 'test' }),
      ]

      const result = extractEntryPoints(nodes)

      expect(result).toEqual([])
    })

    it('handles mixed UI and API entry points', () => {
      const nodes = [
        createNode({ id: 'ui-1', type: 'UI', route: '/dashboard' }),
        createNode({ id: 'api-1', type: 'API', path: '/api/orders' }),
        createNode({ id: 'uc-1', type: 'UseCase' }),
      ]

      const result = extractEntryPoints(nodes)

      expect(result).toEqual(['/dashboard', '/api/orders'])
    })

    it('returns all entry points in order encountered', () => {
      const nodes = [
        createNode({ id: 'ui-1', type: 'UI', route: '/first' }),
        createNode({ id: 'api-1', type: 'API', path: '/second' }),
        createNode({ id: 'ui-2', type: 'UI', route: '/third' }),
      ]

      const result = extractEntryPoints(nodes)

      expect(result).toEqual(['/first', '/second', '/third'])
    })
  })
})
