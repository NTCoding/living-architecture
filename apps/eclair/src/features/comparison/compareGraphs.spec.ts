import {
  describe, it, expect 
} from 'vitest'
import { compareGraphs } from './compareGraphs'
import type { RiviereGraph } from '@living-architecture/riviere-schema'
import type {
  Node, Edge 
} from '@/platform/domain/eclair-types'
import {
  parseNode,
  parseEdge,
  parseDomainMetadata,
  type RawNode,
  type RawEdge,
} from '@/platform/infra/__fixtures__/riviere-test-fixtures'

const testSourceLocation = {
  repository: 'test-repo',
  filePath: 'src/test.ts',
}

function createTestNode(
  overrides: Partial<RawNode> & {
    id: string
    name: string
    domain: string
    module: string
  },
): Node {
  const raw: RawNode = {
    sourceLocation: testSourceLocation,
    type: 'API',
    apiType: 'other',
    ...overrides,
  }
  return parseNode(raw)
}

function createTestEdge(source: string, target: string, overrides: Partial<RawEdge> = {}): Edge {
  const raw: RawEdge = {
    source,
    target,
    ...overrides,
  }
  return parseEdge(raw)
}

function createTestGraph(nodes: Node[], edges: Edge[], name = 'Test Graph'): RiviereGraph {
  return {
    version: '1.0',
    metadata: {
      name,
      domains: parseDomainMetadata({
        'test-domain': {
          description: 'Test domain',
          systemType: 'domain',
        },
      }),
    },
    components: nodes,
    links: edges,
  }
}

describe('compareGraphs', () => {
  describe('comparing identical graphs', () => {
    it('returns empty diff when both graphs are identical', () => {
      const nodeA = createTestNode({
        id: 'node-1',
        name: 'API Endpoint',
        domain: 'test',
        module: 'api',
      })
      const edge = createTestEdge('node-1', 'node-2')
      const before = createTestGraph([nodeA], [edge])
      const after = createTestGraph([nodeA], [edge])

      const diff = compareGraphs(before, after)

      expect(diff).toMatchObject({
        nodes: {
          added: [],
          removed: [],
          modified: [],
        },
        edges: {
          added: [],
          removed: [],
          modified: [],
        },
      })
      expect(diff.nodes.unchanged).toHaveLength(1)
      expect(diff.edges.unchanged).toHaveLength(1)
    })
  })

  describe('detecting added nodes', () => {
    it('identifies nodes present in after but not in before', () => {
      const existingNode = createTestNode({
        id: 'node-1',
        name: 'Existing',
        domain: 'test',
        module: 'api',
      })
      const newNode = createTestNode({
        id: 'node-2',
        name: 'New API',
        domain: 'test',
        module: 'api',
      })
      const before = createTestGraph([existingNode], [])
      const after = createTestGraph([existingNode, newNode], [])

      const diff = compareGraphs(before, after)

      expect(diff.nodes.added).toHaveLength(1)
      expect(diff.nodes.added[0]?.node.id).toBe('node-2')
      expect(diff.nodes.added[0]?.node.name).toBe('New API')
    })
  })

  describe('detecting removed nodes', () => {
    it('identifies nodes present in before but not in after', () => {
      const remainingNode = createTestNode({
        id: 'node-1',
        name: 'Remaining',
        domain: 'test',
        module: 'api',
      })
      const removedNode = createTestNode({
        id: 'node-2',
        name: 'Removed API',
        domain: 'test',
        module: 'api',
      })
      const before = createTestGraph([remainingNode, removedNode], [])
      const after = createTestGraph([remainingNode], [])

      const diff = compareGraphs(before, after)

      expect(diff.nodes.removed).toHaveLength(1)
      expect(diff.nodes.removed[0]?.node.id).toBe('node-2')
      expect(diff.nodes.removed[0]?.node.name).toBe('Removed API')
    })
  })

  describe('detecting modified nodes', () => {
    it('identifies nodes with same ID but different properties', () => {
      const beforeNode = createTestNode({
        id: 'node-1',
        name: 'Original Name',
        domain: 'test',
        module: 'api',
        description: 'old',
      })
      const afterNode = createTestNode({
        id: 'node-1',
        name: 'Updated Name',
        domain: 'test',
        module: 'api',
        description: 'new',
      })
      const before = createTestGraph([beforeNode], [])
      const after = createTestGraph([afterNode], [])

      const diff = compareGraphs(before, after)

      expect(diff.nodes.modified).toHaveLength(1)
      expect(diff.nodes.modified[0]).toMatchObject({
        before: {
          id: 'node-1',
          name: 'Original Name',
          description: 'old',
        },
        after: {
          id: 'node-1',
          name: 'Updated Name',
          description: 'new',
        },
      })
      expect(new Set(diff.nodes.modified[0]?.changedFields)).toStrictEqual(
        new Set(['name', 'description']),
      )
    })

    it('does not flag nodes as modified when only ID matches and all fields are same', () => {
      const node = createTestNode({
        id: 'node-1',
        name: 'Same',
        domain: 'test',
        module: 'api',
        description: 'same',
      })
      const before = createTestGraph([node], [])
      const after = createTestGraph([node], [])

      const diff = compareGraphs(before, after)

      expect(diff.nodes.modified).toHaveLength(0)
      expect(diff.nodes.unchanged).toHaveLength(1)
    })
  })

  describe('detecting edge changes', () => {
    it('identifies added edges by source-target pair', () => {
      const nodes = [
        createTestNode({
          id: 'node-1',
          name: 'A',
          domain: 'test',
          module: 'api',
        }),
        createTestNode({
          id: 'node-2',
          name: 'B',
          domain: 'test',
          module: 'api',
        }),
      ]
      const before = createTestGraph(nodes, [])
      const after = createTestGraph(nodes, [createTestEdge('node-1', 'node-2')])

      const diff = compareGraphs(before, after)

      expect(diff.edges.added).toHaveLength(1)
      expect(diff.edges.added[0]?.edge.source).toBe('node-1')
      expect(diff.edges.added[0]?.edge.target).toBe('node-2')
    })

    it('identifies removed edges by source-target pair', () => {
      const nodes = [
        createTestNode({
          id: 'node-1',
          name: 'A',
          domain: 'test',
          module: 'api',
        }),
        createTestNode({
          id: 'node-2',
          name: 'B',
          domain: 'test',
          module: 'api',
        }),
      ]
      const before = createTestGraph(nodes, [createTestEdge('node-1', 'node-2')])
      const after = createTestGraph(nodes, [])

      const diff = compareGraphs(before, after)

      expect(diff.edges.removed).toHaveLength(1)
      expect(diff.edges.removed[0]?.edge.source).toBe('node-1')
      expect(diff.edges.removed[0]?.edge.target).toBe('node-2')
    })

    it('identifies modified edges when same source-target but different properties', () => {
      const nodes = [
        createTestNode({
          id: 'node-1',
          name: 'A',
          domain: 'test',
          module: 'api',
        }),
        createTestNode({
          id: 'node-2',
          name: 'B',
          domain: 'test',
          module: 'api',
        }),
      ]
      const beforeEdge = createTestEdge('node-1', 'node-2', { type: 'sync' })
      const afterEdge = createTestEdge('node-1', 'node-2', { type: 'async' })
      const before = createTestGraph(nodes, [beforeEdge])
      const after = createTestGraph(nodes, [afterEdge])

      const diff = compareGraphs(before, after)

      expect(diff.edges.modified).toHaveLength(1)
      expect(diff.edges.modified[0]?.before.type).toBe('sync')
      expect(diff.edges.modified[0]?.after.type).toBe('async')
    })
  })

  describe('computing statistics', () => {
    it('provides accurate counts for all change types', () => {
      const beforeNodes = [
        createTestNode({
          id: 'unchanged',
          name: 'Unchanged',
          domain: 'test',
          module: 'api',
        }),
        createTestNode({
          id: 'modified',
          name: 'Before Mod',
          domain: 'test',
          module: 'api',
        }),
        createTestNode({
          id: 'removed',
          name: 'Removed',
          domain: 'test',
          module: 'api',
        }),
      ]
      const afterNodes = [
        createTestNode({
          id: 'unchanged',
          name: 'Unchanged',
          domain: 'test',
          module: 'api',
        }),
        createTestNode({
          id: 'modified',
          name: 'After Mod',
          domain: 'test',
          module: 'api',
        }),
        createTestNode({
          id: 'added',
          name: 'Added',
          domain: 'test',
          module: 'api',
        }),
      ]
      const before = createTestGraph(beforeNodes, [])
      const after = createTestGraph(afterNodes, [])

      const diff = compareGraphs(before, after)

      expect(diff.stats.nodesAdded).toBe(1)
      expect(diff.stats.nodesRemoved).toBe(1)
      expect(diff.stats.nodesModified).toBe(1)
      expect(diff.stats.nodesUnchanged).toBe(1)
    })
  })

  describe('categorizing changes by domain', () => {
    it('groups node changes by their domain', () => {
      const node1 = createTestNode({
        id: 'node-1',
        name: 'Orders API',
        domain: 'orders',
        module: 'api',
      })
      const node2 = createTestNode({
        id: 'node-2',
        name: 'Shipping API',
        domain: 'shipping',
        module: 'api',
      })
      const before = createTestGraph([], [])
      const after = createTestGraph([node1, node2], [])

      const diff = compareGraphs(before, after)

      expect(diff.byDomain['orders']?.added).toHaveLength(1)
      expect(diff.byDomain['shipping']?.added).toHaveLength(1)
    })
  })

  describe('categorizing changes by node type', () => {
    it('groups node changes by their type', () => {
      const apiNode = createTestNode({
        id: 'api-1',
        name: 'API',
        type: 'API',
        domain: 'test',
        module: 'api',
      })
      const eventNode = createTestNode({
        id: 'event-1',
        name: 'Event',
        type: 'Event',
        domain: 'test',
        module: 'events',
        eventName: 'TestEvent',
      })
      const before = createTestGraph([], [])
      const after = createTestGraph([apiNode, eventNode], [])

      const diff = compareGraphs(before, after)

      expect(diff.byNodeType['API']?.added).toHaveLength(1)
      expect(diff.byNodeType['Event']?.added).toHaveLength(1)
    })
  })

  describe('detecting type-specific field changes', () => {
    it('detects eventSchema changes on Event nodes', () => {
      const beforeEvent = createTestNode({
        id: 'event-1',
        name: 'Order Placed',
        type: 'Event',
        domain: 'orders',
        module: 'events',
        eventName: 'order.placed',
        eventSchema: '{ orderId: string }',
      })
      const afterEvent = createTestNode({
        id: 'event-1',
        name: 'Order Placed',
        type: 'Event',
        domain: 'orders',
        module: 'events',
        eventName: 'order.placed',
        eventSchema: '{ orderId: string, customerId: string }',
      })
      const before = createTestGraph([beforeEvent], [])
      const after = createTestGraph([afterEvent], [])

      const diff = compareGraphs(before, after)

      expect(diff.nodes.modified).toHaveLength(1)
      expect(diff.nodes.modified[0]?.changedFields).toContain('eventSchema')
    })

    it('detects subscribedEvents changes on EventHandler nodes', () => {
      const beforeHandler = createTestNode({
        id: 'handler-1',
        name: 'Handle Order Events',
        type: 'EventHandler',
        domain: 'shipping',
        module: 'handlers',
        subscribedEvents: ['order.placed'],
      })
      const afterHandler = createTestNode({
        id: 'handler-1',
        name: 'Handle Order Events',
        type: 'EventHandler',
        domain: 'shipping',
        module: 'handlers',
        subscribedEvents: ['order.placed', 'order.updated'],
      })
      const before = createTestGraph([beforeHandler], [])
      const after = createTestGraph([afterHandler], [])

      const diff = compareGraphs(before, after)

      expect(diff.nodes.modified).toHaveLength(1)
      expect(diff.nodes.modified[0]?.changedFields).toContain('subscribedEvents')
    })

    it('detects DomainOp-specific field changes', () => {
      const beforeOp = createTestNode({
        id: 'op-1',
        name: 'Create Order',
        type: 'DomainOp',
        domain: 'orders',
        module: 'operations',
        operationName: 'create',
        entity: 'Order',
        signature: {
          parameters: [
            {
              name: 'data',
              type: 'OrderData',
            },
          ],
          returnType: 'Order',
        },
        behavior: {
          reads: ['customer'],
          modifies: ['order'],
        },
        stateChanges: [
          {
            from: 'New',
            to: 'Pending',
          },
        ],
      })
      const afterOp = createTestNode({
        id: 'op-1',
        name: 'Create Order',
        type: 'DomainOp',
        domain: 'orders',
        module: 'operations',
        operationName: 'create',
        entity: 'Order',
        signature: {
          parameters: [
            {
              name: 'data',
              type: 'OrderData',
            },
            {
              name: 'user',
              type: 'User',
            },
          ],
          returnType: 'Order',
        },
        behavior: {
          reads: ['customer', 'user'],
          modifies: ['order'],
          emits: ['order.created'],
        },
        stateChanges: [
          {
            from: 'New',
            to: 'Pending',
          },
          {
            from: 'Pending',
            to: 'Assigned',
          },
        ],
      })
      const before = createTestGraph([beforeOp], [])
      const after = createTestGraph([afterOp], [])

      const diff = compareGraphs(before, after)

      expect(diff.nodes.modified).toHaveLength(1)
      expect(diff.nodes.modified[0]?.changedFields).toContain('signature')
      expect(diff.nodes.modified[0]?.changedFields).toContain('behavior')
      expect(diff.nodes.modified[0]?.changedFields).toContain('stateChanges')
    })

    it('detects UI-specific route changes', () => {
      const beforeUI = createTestNode({
        id: 'ui-1',
        name: 'Order Page',
        type: 'UI',
        domain: 'orders',
        module: 'pages',
        route: '/orders',
      })
      const afterUI = createTestNode({
        id: 'ui-1',
        name: 'Order Page',
        type: 'UI',
        domain: 'orders',
        module: 'pages',
        route: '/orders/:id',
      })
      const before = createTestGraph([beforeUI], [])
      const after = createTestGraph([afterUI], [])

      const diff = compareGraphs(before, after)

      expect(diff.nodes.modified).toHaveLength(1)
      expect(diff.nodes.modified[0]?.changedFields).toContain('route')
    })
  })
})
