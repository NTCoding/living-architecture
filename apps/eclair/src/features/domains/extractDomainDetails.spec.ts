import {
  describe, it, expect 
} from 'vitest'
import { extractDomainDetails } from './extractDomainDetails'
import {
  parseNode,
  parseDomainMetadata,
  parseDomainKey,
  type RawNode,
} from '@/lib/riviereTestFixtures'
import type { RiviereGraph } from '@/types/riviere'
const testSourceLocation = {
  repository: 'test-repo',
  filePath: 'src/test.ts',
}

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

function createNode(overrides: Partial<RawNode> = {}): ReturnType<typeof parseNode> {
  const defaults: RawNode = {
    sourceLocation: testSourceLocation,
    id: 'node-1',
    type: 'API',
    apiType: 'other',
    name: 'Test Node',
    domain: 'test-domain',
    module: 'test-module',
  }
  return parseNode({
    ...defaults,
    ...overrides,
  })
}

describe('extractDomainDetails', () => {
  describe('basic domain info', () => {
    it('returns null for non-existent domain', () => {
      const graph = createMinimalGraph({
        metadata: {
          domains: parseDomainMetadata({
            'other-domain': {
              description: 'Other',
              systemType: 'domain',
            },
          }),
        },
      })

      const result = extractDomainDetails(graph, parseDomainKey('non-existent'))

      expect(result).toBeNull()
    })

    it('extracts domain id, name, description and systemType', () => {
      const graph = createMinimalGraph({
        metadata: {
          domains: parseDomainMetadata({
            'order-domain': {
              description: 'Manages orders',
              systemType: 'domain',
            },
          }),
        },
      })

      const result = extractDomainDetails(graph, parseDomainKey('order-domain'))

      expect(result).not.toBeNull()
      expect(result?.id).toBe('order-domain')
      expect(result?.description).toBe('Manages orders')
      expect(result?.systemType).toBe('domain')
    })
  })

  describe('nodes extraction', () => {
    it('extracts all nodes belonging to domain with type and location', () => {
      const graph = createMinimalGraph({
        metadata: {
          domains: parseDomainMetadata({
            'order-domain': {
              description: 'Orders',
              systemType: 'domain',
            },
          }),
        },
        components: [
          createNode({
            id: 'api-1',
            type: 'API',
            apiType: 'other',
            name: 'POST /orders',
            domain: 'order-domain',
            sourceLocation: {
              repository: 'test-repo',
              filePath: 'src/api/orders.ts',
              lineNumber: 12,
            },
          }),
          createNode({
            id: 'uc-1',
            type: 'UseCase',
            name: 'Place Order',
            domain: 'order-domain',
            sourceLocation: {
              repository: 'test-repo',
              filePath: 'src/usecases/PlaceOrder.ts',
              lineNumber: 8,
            },
          }),
          createNode({
            id: 'other-1',
            type: 'API',
            apiType: 'other',
            name: 'Other API',
            domain: 'other-domain',
          }),
        ],
      })

      const result = extractDomainDetails(graph, parseDomainKey('order-domain'))

      expect(result?.nodes).toHaveLength(2)
      expect(result?.nodes[0]).toStrictEqual({
        id: 'api-1',
        type: 'API',
        name: 'POST /orders',
        location: 'src/api/orders.ts:12',
        sourceLocation: {
          repository: 'test-repo',
          filePath: 'src/api/orders.ts',
          lineNumber: 12,
        },
      })
      expect(result?.nodes[1]).toStrictEqual({
        id: 'uc-1',
        type: 'UseCase',
        name: 'Place Order',
        location: 'src/usecases/PlaceOrder.ts:8',
        sourceLocation: {
          repository: 'test-repo',
          filePath: 'src/usecases/PlaceOrder.ts',
          lineNumber: 8,
        },
      })
    })

    it('sorts nodes by type priority (UI, API, UseCase, DomainOp, Event, EventHandler, Custom)', () => {
      const graph = createMinimalGraph({
        metadata: {
          domains: parseDomainMetadata({
            'order-domain': {
              description: 'Orders',
              systemType: 'domain',
            },
          }),
        },
        components: [
          createNode({
            id: 'handler-1',
            type: 'EventHandler',
            name: 'Handler',
            domain: 'order-domain',
            subscribedEvents: ['Event'],
          }),
          createNode({
            id: 'api-1',
            type: 'API',
            name: 'API',
            domain: 'order-domain',
          }),
          createNode({
            id: 'ui-1',
            type: 'UI',
            name: 'UI',
            domain: 'order-domain',
            route: '/ui',
          }),
          createNode({
            id: 'event-1',
            type: 'Event',
            name: 'Event',
            domain: 'order-domain',
            eventName: 'Event',
          }),
          createNode({
            id: 'uc-1',
            type: 'UseCase',
            name: 'UseCase',
            domain: 'order-domain',
          }),
          createNode({
            id: 'op-1',
            type: 'DomainOp',
            name: 'DomainOp',
            domain: 'order-domain',
            operationName: 'op',
          }),
        ],
      })

      const result = extractDomainDetails(graph, parseDomainKey('order-domain'))

      const types = result?.nodes.map((n) => n.type)
      expect(types).toStrictEqual(['UI', 'API', 'UseCase', 'DomainOp', 'Event', 'EventHandler'])
    })
  })

  describe('events extraction', () => {
    it('extracts published events with full event data', () => {
      const graph = createMinimalGraph({
        metadata: {
          domains: parseDomainMetadata({
            'order-domain': {
              description: 'Orders',
              systemType: 'domain',
            },
          }),
        },
        components: [
          createNode({
            id: 'evt-1',
            type: 'Event',
            name: 'OrderPlaced',
            domain: 'order-domain',
            eventName: 'OrderPlaced',
            eventSchema: '{ orderId: string, items: Item[] }',
            sourceLocation: {
              repository: 'test-repo',
              filePath: 'src/events.ts',
              lineNumber: 10,
            },
          }),
        ],
      })

      const result = extractDomainDetails(graph, parseDomainKey('order-domain'))

      expect(result?.events.published).toHaveLength(1)
      expect(result?.events.published[0]).toStrictEqual({
        id: 'evt-1',
        eventName: 'OrderPlaced',
        schema: '{ orderId: string, items: Item[] }',
        sourceLocation: {
          repository: 'test-repo',
          filePath: 'src/events.ts',
          lineNumber: 10,
        },
        handlers: [],
      })
    })

    it('includes handlers that subscribe to published events', () => {
      const graph = createMinimalGraph({
        metadata: {
          domains: parseDomainMetadata({
            'order-domain': {
              description: 'Orders',
              systemType: 'domain',
            },
            'inventory-domain': {
              description: 'Inventory',
              systemType: 'domain',
            },
            'shipping-domain': {
              description: 'Shipping',
              systemType: 'domain',
            },
          }),
        },
        components: [
          createNode({
            id: 'evt-1',
            type: 'Event',
            name: 'OrderPlaced',
            domain: 'order-domain',
            eventName: 'OrderPlaced',
          }),
          createNode({
            id: 'handler-inv',
            type: 'EventHandler',
            name: 'Reserve Inventory Handler',
            domain: 'inventory-domain',
            subscribedEvents: ['OrderPlaced'],
          }),
          createNode({
            id: 'handler-ship',
            type: 'EventHandler',
            name: 'Create Shipment Handler',
            domain: 'shipping-domain',
            subscribedEvents: ['OrderPlaced'],
          }),
        ],
      })

      const result = extractDomainDetails(graph, parseDomainKey('order-domain'))
      const orderPlacedEvent = result?.events.published.find((e) => e.eventName === 'OrderPlaced')

      expect(orderPlacedEvent?.handlers).toHaveLength(2)
      expect(orderPlacedEvent?.handlers).toContainEqual({
        handlerId: 'handler-inv',
        domain: 'inventory-domain',
        handlerName: 'Reserve Inventory Handler',
      })
      expect(orderPlacedEvent?.handlers).toContainEqual({
        handlerId: 'handler-ship',
        domain: 'shipping-domain',
        handlerName: 'Create Shipment Handler',
      })
    })

    it('sorts published events alphabetically', () => {
      const graph = createMinimalGraph({
        metadata: {
          domains: parseDomainMetadata({
            'order-domain': {
              description: 'Orders',
              systemType: 'domain',
            },
          }),
        },
        components: [
          createNode({
            id: 'evt-1',
            type: 'Event',
            name: 'ZebraEvent',
            domain: 'order-domain',
            eventName: 'ZebraEvent',
          }),
          createNode({
            id: 'evt-2',
            type: 'Event',
            name: 'AppleEvent',
            domain: 'order-domain',
            eventName: 'AppleEvent',
          }),
        ],
      })

      const result = extractDomainDetails(graph, parseDomainKey('order-domain'))

      expect(result?.events.published.map((e) => e.eventName)).toStrictEqual([
        'AppleEvent',
        'ZebraEvent',
      ])
    })

    it('extracts consumed events as full handler objects', () => {
      const graph = createMinimalGraph({
        metadata: {
          domains: parseDomainMetadata({
            'order-domain': {
              description: 'Orders',
              systemType: 'domain',
            },
          }),
        },
        components: [
          createNode({
            id: 'handler-1',
            type: 'EventHandler',
            name: 'Handle Payment Completed',
            domain: 'order-domain',
            description: 'Updates order status when payment succeeds',
            subscribedEvents: ['PaymentCompleted'],
            sourceLocation: {
              repository: 'test-repo',
              filePath: 'src/handlers/payment.ts',
              lineNumber: 15,
            },
          }),
        ],
      })

      const result = extractDomainDetails(graph, parseDomainKey('order-domain'))

      expect(result?.events.consumed).toHaveLength(1)
      expect(result?.events.consumed[0]).toStrictEqual({
        id: 'handler-1',
        handlerName: 'Handle Payment Completed',
        description: 'Updates order status when payment succeeds',
        subscribedEvents: ['PaymentCompleted'],
        subscribedEventsWithDomain: [
          {
            eventName: 'PaymentCompleted',
            sourceKnown: false,
          },
        ],
        sourceLocation: {
          repository: 'test-repo',
          filePath: 'src/handlers/payment.ts',
          lineNumber: 15,
        },
      })
    })

    it('sorts consumed handlers alphabetically by name', () => {
      const graph = createMinimalGraph({
        metadata: {
          domains: parseDomainMetadata({
            'order-domain': {
              description: 'Orders',
              systemType: 'domain',
            },
          }),
        },
        components: [
          createNode({
            id: 'h-1',
            type: 'EventHandler',
            name: 'Zebra Handler',
            domain: 'order-domain',
            subscribedEvents: ['X'],
          }),
          createNode({
            id: 'h-2',
            type: 'EventHandler',
            name: 'Apple Handler',
            domain: 'order-domain',
            subscribedEvents: ['Y'],
          }),
        ],
      })

      const result = extractDomainDetails(graph, parseDomainKey('order-domain'))

      expect(result?.events.consumed.map((h) => h.handlerName)).toStrictEqual([
        'Apple Handler',
        'Zebra Handler',
      ])
    })
  })

  describe('node breakdown', () => {
    it('includes node breakdown counts', () => {
      const graph = createMinimalGraph({
        metadata: {
          domains: parseDomainMetadata({
            'order-domain': {
              description: 'Orders',
              systemType: 'domain',
            },
          }),
        },
        components: [
          createNode({
            id: 'ui-1',
            type: 'UI',
            name: 'UI',
            domain: 'order-domain',
            route: '/ui',
          }),
          createNode({
            id: 'api-1',
            type: 'API',
            name: 'API 1',
            domain: 'order-domain',
          }),
          createNode({
            id: 'api-2',
            type: 'API',
            name: 'API 2',
            domain: 'order-domain',
          }),
          createNode({
            id: 'uc-1',
            type: 'UseCase',
            name: 'UC',
            domain: 'order-domain',
          }),
        ],
      })

      const result = extractDomainDetails(graph, parseDomainKey('order-domain'))

      expect(result?.nodeBreakdown).toStrictEqual({
        UI: 1,
        API: 2,
        UseCase: 1,
        DomainOp: 0,
        Event: 0,
        EventHandler: 0,
        Custom: 0,
      })
    })
  })

  describe('entry points', () => {
    it('includes entry points from UI routes and API paths', () => {
      const graph = createMinimalGraph({
        metadata: {
          domains: parseDomainMetadata({
            'order-domain': {
              description: 'Orders',
              systemType: 'domain',
            },
          }),
        },
        components: [
          createNode({
            id: 'ui-1',
            type: 'UI',
            name: '/orders',
            domain: 'order-domain',
            route: '/orders',
          }),
          createNode({
            id: 'api-1',
            type: 'API',
            name: 'Place Order',
            domain: 'order-domain',
            apiType: 'REST',
            httpMethod: 'POST',
            path: '/api/orders',
          }),
        ],
      })

      const result = extractDomainDetails(graph, parseDomainKey('order-domain'))

      expect(result?.entryPoints).toStrictEqual(['/orders', '/api/orders'])
    })
  })

  describe('repository', () => {
    it('includes repository from first node with sourceLocation.repository', () => {
      const graph = createMinimalGraph({
        metadata: {
          domains: parseDomainMetadata({
            'order-domain': {
              description: 'Orders',
              systemType: 'domain',
            },
          }),
        },
        components: [
          createNode({
            id: 'api-1',
            type: 'API',
            apiType: 'other',
            name: 'API',
            domain: 'order-domain',
            sourceLocation: {
              filePath: 'src/api.ts',
              repository: 'ecommerce-app',
            },
          }),
        ],
      })

      const result = extractDomainDetails(graph, parseDomainKey('order-domain'))

      expect(result?.repository).toBe('ecommerce-app')
    })
  })
})
