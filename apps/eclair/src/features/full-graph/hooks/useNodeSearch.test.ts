import {
 describe, expect, test 
} from 'vitest'
import { filterNodesBySearch } from './useNodeSearch'
import type {
 Node, Edge 
} from '@/types/riviere'
import {
 parseNode, parseEdge 
} from '@/lib/riviereTestData'
const testSourceLocation = {
 repository: 'test-repo',
filePath: 'src/test.ts' 
}

const testNodes: Node[] = [
  parseNode({
 sourceLocation: testSourceLocation,
id: 'ui-1',
type: 'UI',
name: 'Order Page',
domain: 'orders',
module: 'web',
route: '/orders' 
}),
  parseNode({
 sourceLocation: testSourceLocation,
id: 'api-1',
type: 'API',
name: 'Place Order',
domain: 'orders',
module: 'api' 
}),
  parseNode({
 sourceLocation: testSourceLocation,
id: 'usecase-1',
type: 'UseCase',
name: 'PlaceOrderUseCase',
domain: 'orders',
module: 'core' 
}),
  parseNode({
 sourceLocation: testSourceLocation,
id: 'event-1',
type: 'Event',
name: 'OrderPlaced',
domain: 'orders',
module: 'events',
eventName: 'OrderPlaced' 
}),
  parseNode({
 sourceLocation: testSourceLocation,
id: 'handler-1',
type: 'EventHandler',
name: 'ShipmentHandler',
domain: 'shipping',
module: 'handlers',
subscribedEvents: ['OrderPlaced'] 
}),
  parseNode({
 sourceLocation: testSourceLocation,
id: 'api-2',
type: 'API',
name: 'Get Inventory',
domain: 'inventory',
module: 'api' 
}),
]

const testEdges: Edge[] = [
  parseEdge({
 source: 'ui-1',
target: 'api-1' 
}),
  parseEdge({
 source: 'api-1',
target: 'usecase-1' 
}),
  parseEdge({
 source: 'usecase-1',
target: 'event-1' 
}),
  parseEdge({
 source: 'event-1',
target: 'handler-1' 
}),
]

describe('filterNodesBySearch', () => {
  test('returns all node IDs when query is empty', () => {
    const result = filterNodesBySearch('', testNodes, testEdges)

    expect(result.matchingNodeIds.size).toBe(6)
    expect(result.visibleNodeIds.size).toBe(6)
  })

  test('returns all node IDs when query is whitespace only', () => {
    const result = filterNodesBySearch('   ', testNodes, testEdges)

    expect(result.matchingNodeIds.size).toBe(6)
    expect(result.visibleNodeIds.size).toBe(6)
  })

  test('matches nodes by name case-insensitively', () => {
    const result = filterNodesBySearch('order', testNodes, testEdges)

    expect(result.matchingNodeIds).toContain('ui-1')
    expect(result.matchingNodeIds).toContain('api-1')
    expect(result.matchingNodeIds).toContain('usecase-1')
    expect(result.matchingNodeIds).toContain('event-1')
  })

  test('matches nodes by domain', () => {
    const result = filterNodesBySearch('shipping', testNodes, testEdges)

    expect(result.matchingNodeIds).toContain('handler-1')
  })

  test('matches nodes by type', () => {
    const result = filterNodesBySearch('API', testNodes, testEdges)

    expect(result.matchingNodeIds).toContain('api-1')
    expect(result.matchingNodeIds).toContain('api-2')
  })

  test('includes connected nodes in visible set', () => {
    const result = filterNodesBySearch('PlaceOrderUseCase', testNodes, testEdges)

    expect(result.matchingNodeIds).toEqual(new Set(['usecase-1']))
    expect(result.visibleNodeIds).toContain('ui-1')
    expect(result.visibleNodeIds).toContain('api-1')
    expect(result.visibleNodeIds).toContain('usecase-1')
    expect(result.visibleNodeIds).toContain('event-1')
    expect(result.visibleNodeIds).toContain('handler-1')
  })

  test('excludes unconnected nodes from visible set when filtering', () => {
    const result = filterNodesBySearch('PlaceOrderUseCase', testNodes, testEdges)

    expect(result.visibleNodeIds).not.toContain('api-2')
  })

  test('returns empty sets when no nodes match', () => {
    const result = filterNodesBySearch('nonexistent', testNodes, testEdges)

    expect(result.matchingNodeIds.size).toBe(0)
    expect(result.visibleNodeIds.size).toBe(0)
  })

  test('handles multiple matching nodes and merges their connections', () => {
    const result = filterNodesBySearch('API', testNodes, testEdges)

    expect(result.matchingNodeIds).toEqual(new Set(['api-1', 'api-2']))
    expect(result.visibleNodeIds).toContain('ui-1')
    expect(result.visibleNodeIds).toContain('api-1')
    expect(result.visibleNodeIds).toContain('usecase-1')
    expect(result.visibleNodeIds).toContain('api-2')
  })
})
