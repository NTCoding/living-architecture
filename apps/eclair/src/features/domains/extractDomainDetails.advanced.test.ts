import { describe, it, expect } from 'vitest'
import { extractDomainDetails } from './extractDomainDetails'
import { parseNode, parseEdge, parseDomainMetadata, parseDomainKey, type RawNode, type RawEdge } from '@/lib/riviereTestData'
import type { RiviereGraph } from '@/types/riviere'
const testSourceLocation = { repository: 'test-repo', filePath: 'src/test.ts' }

function createMinimalGraph(overrides: Partial<RiviereGraph> = {}): RiviereGraph {
  return {
    version: '1.0',
    metadata: {
      name: 'Test Graph',
      domains: parseDomainMetadata({}),
    },
    components: [],
    links: [],
    ...overrides,
  }
}

function getTypeDefaults(nodeType: string, overrides: Partial<RawNode>): Partial<RawNode> {
  if (nodeType === 'API') return { apiType: 'other' }
  if (nodeType === 'UI') return { route: '/test-route' }
  if (nodeType === 'Event') return { eventName: overrides.eventName ?? 'TestEvent' }
  if (nodeType === 'EventHandler') return { subscribedEvents: overrides.subscribedEvents ?? [] }
  if (nodeType === 'UseCase') return {}
  if (nodeType === 'DomainOp') return { operationName: 'TestDomainOp' }
  if (nodeType === 'Custom') return { customTypeName: 'TestCustomType' }
  return {}
}

function createNode(overrides: Partial<RawNode> = {}): ReturnType<typeof parseNode> {
  const nodeType = overrides.type ?? 'API'
  const typeDefaults = getTypeDefaults(nodeType, overrides)
  const base: RawNode = {
    sourceLocation: testSourceLocation,
    id: 'node-1',
    type: nodeType,
    name: 'Test Node',
    domain: 'test-domain',
    module: 'test-module',
    ...typeDefaults,
  }
  return parseNode({ ...base, ...overrides })
}

function createEdge(overrides: Partial<RawEdge> = {}): ReturnType<typeof parseEdge> {
  const defaults: RawEdge = {
    source: 'node-1',
    target: 'node-2',
  }
  return parseEdge({ ...defaults, ...overrides })
}

describe('extractDomainDetails - advanced tests', () => {
  describe('cross-domain edges extraction', () => {
    it('extracts outgoing edges to other domains with edge type', () => {
      const graph = createMinimalGraph({
        metadata: {
          domains: parseDomainMetadata({
            'order-domain': { description: 'Orders', systemType: 'domain' },
            'inventory-domain': { description: 'Inventory', systemType: 'domain' },
            'shipping-domain': { description: 'Shipping', systemType: 'domain' },
          }),
        },
        components: [
          createNode({ id: 'order-evt', type: 'Event', name: 'OrderPlaced', domain: 'order-domain', eventName: 'OrderPlaced' }),
          createNode({ id: 'inv-handler', type: 'EventHandler', name: 'ReserveInventory', domain: 'inventory-domain', subscribedEvents: ['OrderPlaced'] }),
          createNode({ id: 'ship-handler', type: 'EventHandler', name: 'CreateShipment', domain: 'shipping-domain', subscribedEvents: ['OrderPlaced'] }),
        ],
        links: [
          createEdge({ source: 'order-evt', target: 'inv-handler', type: 'async' }),
          createEdge({ source: 'order-evt', target: 'ship-handler', type: 'async' }),
        ],
      })

      const result = extractDomainDetails(graph, parseDomainKey('order-domain'))

      expect(result?.crossDomainEdges).toHaveLength(2)
      expect(result?.crossDomainEdges).toContainEqual({ targetDomain: 'inventory-domain', edgeType: 'async' })
      expect(result?.crossDomainEdges).toContainEqual({ targetDomain: 'shipping-domain', edgeType: 'async' })
    })

    it('extracts sync edges', () => {
      const graph = createMinimalGraph({
        metadata: {
          domains: parseDomainMetadata({
            'bff-domain': { description: 'BFF', systemType: 'bff' },
            'order-domain': { description: 'Orders', systemType: 'domain' },
          }),
        },
        components: [
          createNode({ id: 'bff-api', type: 'API', name: 'BFF API', domain: 'bff-domain' }),
          createNode({ id: 'order-api', type: 'API', name: 'Order API', domain: 'order-domain' }),
        ],
        links: [
          createEdge({ source: 'bff-api', target: 'order-api', type: 'sync' }),
        ],
      })

      const result = extractDomainDetails(graph, parseDomainKey('bff-domain'))

      expect(result?.crossDomainEdges).toEqual([{ targetDomain: 'order-domain', edgeType: 'sync' }])
    })

    it('ignores intra-domain edges', () => {
      const graph = createMinimalGraph({
        metadata: {
          domains: parseDomainMetadata({ 'order-domain': { description: 'Orders', systemType: 'domain' } }),
        },
        components: [
          createNode({ id: 'api-1', type: 'API', name: 'API', domain: 'order-domain' }),
          createNode({ id: 'uc-1', type: 'UseCase', name: 'UC', domain: 'order-domain' }),
        ],
        links: [
          createEdge({ source: 'api-1', target: 'uc-1', type: 'sync' }),
        ],
      })

      const result = extractDomainDetails(graph, parseDomainKey('order-domain'))

      expect(result?.crossDomainEdges).toEqual([])
    })

    it('deduplicates cross-domain edges to same target', () => {
      const graph = createMinimalGraph({
        metadata: {
          domains: parseDomainMetadata({
            'order-domain': { description: 'Orders', systemType: 'domain' },
            'inventory-domain': { description: 'Inventory', systemType: 'domain' },
          }),
        },
        components: [
          createNode({ id: 'evt-1', type: 'Event', name: 'Event1', domain: 'order-domain', eventName: 'Event1' }),
          createNode({ id: 'evt-2', type: 'Event', name: 'Event2', domain: 'order-domain', eventName: 'Event2' }),
          createNode({ id: 'handler-1', type: 'EventHandler', name: 'Handler1', domain: 'inventory-domain', subscribedEvents: ['Event1'] }),
          createNode({ id: 'handler-2', type: 'EventHandler', name: 'Handler2', domain: 'inventory-domain', subscribedEvents: ['Event2'] }),
        ],
        links: [
          createEdge({ source: 'evt-1', target: 'handler-1', type: 'async' }),
          createEdge({ source: 'evt-2', target: 'handler-2', type: 'async' }),
        ],
      })

      const result = extractDomainDetails(graph, parseDomainKey('order-domain'))

      expect(result?.crossDomainEdges).toEqual([{ targetDomain: 'inventory-domain', edgeType: 'async' }])
    })

    it('sorts cross-domain edges alphabetically by target domain', () => {
      const graph = createMinimalGraph({
        metadata: {
          domains: parseDomainMetadata({
            'order-domain': { description: 'Orders', systemType: 'domain' },
            'zebra-domain': { description: 'Zebra', systemType: 'domain' },
            'apple-domain': { description: 'Apple', systemType: 'domain' },
          }),
        },
        components: [
          createNode({ id: 'evt-1', type: 'Event', name: 'Event1', domain: 'order-domain', eventName: 'Event1' }),
          createNode({ id: 'h-z', type: 'EventHandler', name: 'Z Handler', domain: 'zebra-domain', subscribedEvents: ['Event1'] }),
          createNode({ id: 'h-a', type: 'EventHandler', name: 'A Handler', domain: 'apple-domain', subscribedEvents: ['Event1'] }),
        ],
        links: [
          createEdge({ source: 'evt-1', target: 'h-z', type: 'async' }),
          createEdge({ source: 'evt-1', target: 'h-a', type: 'async' }),
        ],
      })

      const result = extractDomainDetails(graph, parseDomainKey('order-domain'))

      expect(result?.crossDomainEdges.map((e) => e.targetDomain)).toEqual(['apple-domain', 'zebra-domain'])
    })
  })

  describe('aggregated connections', () => {
    it('aggregates outgoing connections by target domain with API and event counts', () => {
      const graph = createMinimalGraph({
        metadata: {
          domains: parseDomainMetadata({
            'order-domain': { description: 'Orders', systemType: 'domain' },
            'inventory-domain': { description: 'Inventory', systemType: 'domain' },
          }),
        },
        components: [
          createNode({ id: 'order-api', type: 'API', name: 'OrderAPI', domain: 'order-domain' }),
          createNode({ id: 'order-evt', type: 'Event', name: 'OrderPlaced', domain: 'order-domain', eventName: 'OrderPlaced' }),
          createNode({ id: 'inv-api', type: 'API', name: 'ReserveAPI', domain: 'inventory-domain' }),
          createNode({ id: 'inv-handler', type: 'EventHandler', name: 'Handler', domain: 'inventory-domain', subscribedEvents: ['OrderPlaced'] }),
        ],
        links: [
          createEdge({ source: 'order-api', target: 'inv-api', type: 'sync' }),
          createEdge({ source: 'order-evt', target: 'inv-handler', type: 'async' }),
        ],
      })

      const result = extractDomainDetails(graph, parseDomainKey('order-domain'))

      expect(result?.aggregatedConnections).toContainEqual({
        targetDomain: 'inventory-domain',
        direction: 'outgoing',
        apiCount: 1,
        eventCount: 1,
      })
    })

    it('aggregates incoming connections from other domains', () => {
      const graph = createMinimalGraph({
        metadata: {
          domains: parseDomainMetadata({
            'order-domain': { description: 'Orders', systemType: 'domain' },
            'bff-domain': { description: 'BFF', systemType: 'bff' },
          }),
        },
        components: [
          createNode({ id: 'bff-api', type: 'API', name: 'BFF', domain: 'bff-domain' }),
          createNode({ id: 'order-api', type: 'API', name: 'OrderAPI', domain: 'order-domain' }),
        ],
        links: [
          createEdge({ source: 'bff-api', target: 'order-api', type: 'sync' }),
        ],
      })

      const result = extractDomainDetails(graph, parseDomainKey('order-domain'))

      expect(result?.aggregatedConnections).toContainEqual({
        targetDomain: 'bff-domain',
        direction: 'incoming',
        apiCount: 1,
        eventCount: 0,
      })
    })

    it('counts multiple edges to same domain', () => {
      const graph = createMinimalGraph({
        metadata: {
          domains: parseDomainMetadata({
            'order-domain': { description: 'Orders', systemType: 'domain' },
            'inventory-domain': { description: 'Inventory', systemType: 'domain' },
          }),
        },
        components: [
          createNode({ id: 'order-api-1', type: 'API', name: 'API1', domain: 'order-domain' }),
          createNode({ id: 'order-api-2', type: 'API', name: 'API2', domain: 'order-domain' }),
          createNode({ id: 'inv-api-1', type: 'API', name: 'InvAPI1', domain: 'inventory-domain' }),
          createNode({ id: 'inv-api-2', type: 'API', name: 'InvAPI2', domain: 'inventory-domain' }),
        ],
        links: [
          createEdge({ source: 'order-api-1', target: 'inv-api-1', type: 'sync' }),
          createEdge({ source: 'order-api-2', target: 'inv-api-2', type: 'sync' }),
        ],
      })

      const result = extractDomainDetails(graph, parseDomainKey('order-domain'))
      const invConnection = result?.aggregatedConnections.find((c) => c.targetDomain === 'inventory-domain')

      expect(invConnection?.apiCount).toBe(2)
    })
  })

  describe('operation details', () => {
    it('includes behavior data for entity operations', () => {
      const graph = createMinimalGraph({
        metadata: {
          domains: parseDomainMetadata({ 'order-domain': { description: 'Orders', systemType: 'domain' } }),
        },
        components: [
          createNode({
            id: 'op-1',
            type: 'DomainOp',
            name: 'Order.begin()',
            domain: 'order-domain',
            entity: 'Order',
            operationName: 'begin',
            behavior: {
              reads: ['items', 'customerId'],
              validates: ['items.length > 0'],
              modifies: ['state'],
              emits: ['order-placed'],
            },
          }),
        ],
      })

      const result = extractDomainDetails(graph, parseDomainKey('order-domain'))
      const orderEntity = result?.entities.find((e) => e.name === 'Order')
      const beginOp = orderEntity?.operationDetails?.find((op) => op.operationName === 'begin')

      expect(beginOp?.behavior).toEqual({
        reads: ['items', 'customerId'],
        validates: ['items.length > 0'],
        modifies: ['state'],
        emits: ['order-placed'],
      })
    })

    it('includes state changes for entity operations', () => {
      const graph = createMinimalGraph({
        metadata: {
          domains: parseDomainMetadata({ 'order-domain': { description: 'Orders', systemType: 'domain' } }),
        },
        components: [
          createNode({
            id: 'op-1',
            type: 'DomainOp',
            name: 'Order.begin()',
            domain: 'order-domain',
            entity: 'Order',
            operationName: 'begin',
            stateChanges: [{ from: 'Draft', to: 'Placed' }],
          }),
        ],
      })

      const result = extractDomainDetails(graph, parseDomainKey('order-domain'))
      const orderEntity = result?.entities.find((e) => e.name === 'Order')
      const beginOp = orderEntity?.operationDetails?.find((op) => op.operationName === 'begin')

      expect(beginOp?.stateChanges).toEqual([{ from: 'Draft', to: 'Placed' }])
    })

    it('includes signature for entity operations', () => {
      const graph = createMinimalGraph({
        metadata: {
          domains: parseDomainMetadata({ 'order-domain': { description: 'Orders', systemType: 'domain' } }),
        },
        components: [
          createNode({
            id: 'op-1',
            type: 'DomainOp',
            name: 'Order.begin()',
            domain: 'order-domain',
            entity: 'Order',
            operationName: 'begin',
            signature: {
              parameters: [
                { name: 'items', type: 'OrderItem[]' },
                { name: 'customerId', type: 'string' },
              ],
              returnType: 'Order',
            },
          }),
        ],
      })

      const result = extractDomainDetails(graph, parseDomainKey('order-domain'))
      const orderEntity = result?.entities.find((e) => e.name === 'Order')
      const beginOp = orderEntity?.operationDetails?.find((op) => op.operationName === 'begin')

      expect(beginOp?.signature?.parameters).toHaveLength(2)
      expect(beginOp?.signature?.returnType).toBe('Order')
    })

    it('includes source location for entity operations', () => {
      const graph = createMinimalGraph({
        metadata: {
          domains: parseDomainMetadata({ 'order-domain': { description: 'Orders', systemType: 'domain' } }),
        },
        components: [
          createNode({
            id: 'op-1',
            type: 'DomainOp',
            name: 'Order.begin()',
            domain: 'order-domain',
            entity: 'Order',
            operationName: 'begin',
            sourceLocation: { repository: 'test-repo', filePath: 'src/Order.ts', lineNumber: 23 },
          }),
        ],
      })

      const result = extractDomainDetails(graph, parseDomainKey('order-domain'))
      const orderEntity = result?.entities.find((e) => e.name === 'Order')
      const beginOp = orderEntity?.operationDetails?.find((op) => op.operationName === 'begin')

      expect(beginOp?.sourceLocation?.filePath).toBe('src/Order.ts')
      expect(beginOp?.sourceLocation?.lineNumber).toBe(23)
    })
  })

  describe('entity state machine', () => {
    it('aggregates all unique states from operation stateChanges', () => {
      const graph = createMinimalGraph({
        metadata: {
          domains: parseDomainMetadata({ 'order-domain': { description: 'Orders', systemType: 'domain' } }),
        },
        components: [
          createNode({
            id: 'op-1',
            type: 'DomainOp',
            name: 'Order.begin()',
            domain: 'order-domain',
            entity: 'Order',
            operationName: 'begin',
            stateChanges: [{ from: 'Draft', to: 'Placed' }],
          }),
          createNode({
            id: 'op-2',
            type: 'DomainOp',
            name: 'Order.confirm()',
            domain: 'order-domain',
            entity: 'Order',
            operationName: 'confirm',
            stateChanges: [{ from: 'Placed', to: 'Confirmed' }],
          }),
          createNode({
            id: 'op-3',
            type: 'DomainOp',
            name: 'Order.ship()',
            domain: 'order-domain',
            entity: 'Order',
            operationName: 'ship',
            stateChanges: [{ from: 'Confirmed', to: 'Shipped' }],
          }),
        ],
      })

      const result = extractDomainDetails(graph, parseDomainKey('order-domain'))
      const orderEntity = result?.entities.find((e) => e.name === 'Order')

      expect(orderEntity?.allStates).toEqual(['Draft', 'Placed', 'Confirmed', 'Shipped'])
    })
  })
})
