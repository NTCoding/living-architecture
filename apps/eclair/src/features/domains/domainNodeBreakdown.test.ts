import {
 describe, it, expect 
} from 'vitest'
import {
  countNodesByType,
  formatDomainNodes,
  extractEntryPoints,
  type NodeBreakdown,
} from './domainNodeBreakdown'
import { parseNode } from '@/lib/riviereTestData'
import type { SourceLocation } from '@/types/riviere'
import type { RawNode } from '@/lib/riviereTestData'

const testSourceLocation = {
 repository: 'test-repo',
filePath: 'src/test.ts' 
}

function createNode(overrides: Partial<RawNode> = {}): ReturnType<typeof parseNode> {
  return parseNode({
    sourceLocation: testSourceLocation,
    id: 'node-1',
    type: 'API',
    apiType: 'other',
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
        createNode({
 id: 'ui-1',
type: 'UI',
route: '/test' 
}),
        createNode({
 id: 'api-1',
type: 'API' 
}),
        createNode({
 id: 'uc-1',
type: 'UseCase' 
}),
        createNode({
 id: 'op-1',
type: 'DomainOp',
operationName: 'test' 
}),
        createNode({
 id: 'event-1',
type: 'Event',
eventName: 'TestEvent' 
}),
        createNode({
 id: 'handler-1',
type: 'EventHandler',
subscribedEvents: ['TestEvent'] 
}),
        createNode({
 id: 'custom-1',
type: 'Custom',
customTypeName: 'TestCustomType' 
}),
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
        createNode({
 id: 'api-1',
type: 'API' 
}),
        createNode({
 id: 'api-2',
type: 'API' 
}),
        createNode({
 id: 'api-3',
type: 'API' 
}),
      ]

      const result = countNodesByType(nodes)

      expect(result.API).toBe(3)
      expect(result.UI).toBe(0)
    })

    it('handles mixed node types', () => {
      const nodes = [
        createNode({
 id: 'ui-1',
type: 'UI',
route: '/test' 
}),
        createNode({
 id: 'api-1',
type: 'API' 
}),
        createNode({
 id: 'api-2',
type: 'API' 
}),
        createNode({
 id: 'event-1',
type: 'Event',
eventName: 'TestEvent' 
}),
        createNode({
 id: 'handler-1',
type: 'EventHandler',
subscribedEvents: ['TestEvent'] 
}),
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
          apiType: 'other',
          sourceLocation: {
 repository: 'test-repo',
filePath: 'src/api/orders.ts',
lineNumber: 42 
},
        }),
      ]

      const result = formatDomainNodes(nodes)

      expect(result[0]?.location).toBe('src/api/orders.ts:42')
    })

    it('handles nodes without sourceLocation', () => {
      const rawNode: RawNode = {
        id: 'api-1',
        type: 'API',
        apiType: 'other',
        name: 'Test Node',
        domain: 'test-domain',
        module: 'test-module',
        sourceLocation: {
 repository: 'test-repo',
filePath: '' 
},
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
          apiType: 'other',
          sourceLocation: {
 repository: 'test-repo',
filePath: 'src/api/orders.ts' 
},
        }),
      ]

      const result = formatDomainNodes(nodes)

      expect(result[0]?.location).toBe('src/api/orders.ts')
    })

    it('sorts by type priority (UI, API, UseCase, DomainOp, Event, EventHandler, Custom)', () => {
      const nodes = [
        createNode({
 id: 'handler-1',
type: 'EventHandler',
subscribedEvents: ['TestEvent'] 
}),
        createNode({
 id: 'api-1',
type: 'API' 
}),
        createNode({
 id: 'ui-1',
type: 'UI',
route: '/test' 
}),
        createNode({
 id: 'event-1',
type: 'Event',
eventName: 'TestEvent' 
}),
        createNode({
 id: 'uc-1',
type: 'UseCase' 
}),
        createNode({
 id: 'op-1',
type: 'DomainOp',
operationName: 'test' 
}),
        createNode({
 id: 'custom-1',
type: 'Custom',
customTypeName: 'TestCustomType' 
}),
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
      const sourceLocation: SourceLocation = {
 repository: 'test-repo',
filePath: 'src/test.ts',
lineNumber: 10 
}
      const nodes = [
        createNode({
          id: 'api-123',
          type: 'API',
          apiType: 'other',
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

  describe('extractEntryPoints', () => {
    it('extracts routes from UI nodes', () => {
      const nodes = [
        createNode({
 id: 'ui-1',
type: 'UI',
route: '/dashboard' 
}),
        createNode({
 id: 'ui-2',
type: 'UI',
route: '/settings' 
}),
      ]

      const result = extractEntryPoints(nodes)

      expect(result).toContain('/dashboard')
      expect(result).toContain('/settings')
    })

    it('extracts paths from API nodes', () => {
      const nodes = [
        createNode({
 id: 'api-1',
type: 'API',
path: '/api/users' 
}),
        createNode({
 id: 'api-2',
type: 'API',
path: '/api/orders' 
}),
      ]

      const result = extractEntryPoints(nodes)

      expect(result).toContain('/api/users')
      expect(result).toContain('/api/orders')
    })

    it('ignores nodes without path property', () => {
      const nodes = [
        createNode({
 id: 'api-1',
type: 'API',
path: '/api/users' 
}),
        createNode({
 id: 'api-2',
type: 'API' 
}),
      ]

      const result = extractEntryPoints(nodes)

      expect(result).toHaveLength(1)
      expect(result[0]).toBe('/api/users')
    })

    it('ignores non-UI/API nodes', () => {
      const nodes = [
        createNode({
 id: 'api-1',
type: 'API',
path: '/api/users' 
}),
        createNode({
 id: 'uc-1',
type: 'UseCase' 
}),
        createNode({
 id: 'op-1',
type: 'DomainOp',
operationName: 'test' 
}),
      ]

      const result = extractEntryPoints(nodes)

      expect(result).toEqual(['/api/users'])
    })

    it('returns empty array when no entry points', () => {
      const nodes = [
        createNode({
 id: 'uc-1',
type: 'UseCase' 
}),
        createNode({
 id: 'op-1',
type: 'DomainOp',
operationName: 'test' 
}),
      ]

      const result = extractEntryPoints(nodes)

      expect(result).toEqual([])
    })

    it('handles mixed UI and API entry points', () => {
      const nodes = [
        createNode({
 id: 'ui-1',
type: 'UI',
route: '/dashboard' 
}),
        createNode({
 id: 'api-1',
type: 'API',
path: '/api/orders' 
}),
        createNode({
 id: 'uc-1',
type: 'UseCase' 
}),
      ]

      const result = extractEntryPoints(nodes)

      expect(result).toEqual(['/dashboard', '/api/orders'])
    })

    it('returns all entry points in order encountered', () => {
      const nodes = [
        createNode({
 id: 'ui-1',
type: 'UI',
route: '/first' 
}),
        createNode({
 id: 'api-1',
type: 'API',
path: '/second' 
}),
        createNode({
 id: 'ui-2',
type: 'UI',
route: '/third' 
}),
      ]

      const result = extractEntryPoints(nodes)

      expect(result).toEqual(['/first', '/second', '/third'])
    })
  })
})
