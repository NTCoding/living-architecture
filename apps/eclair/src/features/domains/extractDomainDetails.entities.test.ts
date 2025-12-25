import { describe, it, expect } from 'vitest'
import { extractDomainDetails } from './extractDomainDetails'
import { parseNode, parseDomainMetadata, parseDomainKey, type RawNode } from '@/lib/riviereTestData'
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
  return parseNode({ ...defaults, ...overrides })
}

describe('extractDomainDetails entities extraction', () => {
  it('extracts unique entities with their operations', () => {
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
        }),
        createNode({
          id: 'op-2',
          type: 'DomainOp',
          name: 'Order.confirm()',
          domain: 'order-domain',
          entity: 'Order',
          operationName: 'confirm',
        }),
        createNode({
          id: 'op-3',
          type: 'DomainOp',
          name: 'OrderItem.add()',
          domain: 'order-domain',
          entity: 'OrderItem',
          operationName: 'add',
        }),
      ],
    })

    const result = extractDomainDetails(graph, parseDomainKey('order-domain'))

    expect(result?.entities).toHaveLength(2)

    const orderEntity = result?.entities.find((e) => e.name === 'Order')
    expect(orderEntity?.operations).toEqual(['begin', 'confirm'])

    const orderItemEntity = result?.entities.find((e) => e.name === 'OrderItem')
    expect(orderItemEntity?.operations).toEqual(['add'])
  })

  it('sorts entities alphabetically and operations alphabetically', () => {
    const graph = createMinimalGraph({
      metadata: {
        domains: parseDomainMetadata({ 'order-domain': { description: 'Orders', systemType: 'domain' } }),
      },
      components: [
        createNode({ id: 'op-1', type: 'DomainOp', name: 'Zebra.z()', domain: 'order-domain', entity: 'Zebra', operationName: 'z' }),
        createNode({ id: 'op-2', type: 'DomainOp', name: 'Apple.b()', domain: 'order-domain', entity: 'Apple', operationName: 'b' }),
        createNode({ id: 'op-3', type: 'DomainOp', name: 'Apple.a()', domain: 'order-domain', entity: 'Apple', operationName: 'a' }),
      ],
    })

    const result = extractDomainDetails(graph, parseDomainKey('order-domain'))

    expect(result?.entities.map((e) => e.name)).toEqual(['Apple', 'Zebra'])
    expect(result?.entities[0]?.operations).toEqual(['a', 'b'])
  })

  it('returns empty array when no entities', () => {
    const graph = createMinimalGraph({
      metadata: {
        domains: parseDomainMetadata({ 'order-domain': { description: 'Orders', systemType: 'domain' } }),
      },
      components: [
        createNode({ id: 'api-1', type: 'API', name: 'API', domain: 'order-domain' }),
      ],
    })

    const result = extractDomainDetails(graph, parseDomainKey('order-domain'))

    expect(result?.entities).toEqual([])
  })

  it('includes sourceLocation derived from first operation', () => {
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
          sourceLocation: { repository: 'test-repo', filePath: 'src/Order.ts', lineNumber: 10 },
        }),
        createNode({
          id: 'op-2',
          type: 'DomainOp',
          name: 'Order.confirm()',
          domain: 'order-domain',
          entity: 'Order',
          operationName: 'confirm',
          sourceLocation: { repository: 'test-repo', filePath: 'src/Order.ts', lineNumber: 30 },
        }),
      ],
    })

    const result = extractDomainDetails(graph, parseDomainKey('order-domain'))
    const orderEntity = result?.entities.find((e) => e.name === 'Order')

    expect(orderEntity?.sourceLocation).toEqual({ repository: 'test-repo', filePath: 'src/Order.ts', lineNumber: 10 })
  })

  it('handles entity with minimal sourceLocation', () => {
    const rawNode: RawNode = {
      id: 'op-1',
      type: 'DomainOp',
      name: 'Order.begin()',
      domain: 'order-domain',
      module: 'test-module',
      entity: 'Order',
      operationName: 'begin',
      sourceLocation: { repository: 'test-repo', filePath: 'unknown' },
    }
    const graph = createMinimalGraph({
      metadata: {
        domains: parseDomainMetadata({ 'order-domain': { description: 'Orders', systemType: 'domain' } }),
      },
      components: [parseNode(rawNode)],
    })

    const result = extractDomainDetails(graph, parseDomainKey('order-domain'))
    const orderEntity = result?.entities.find((e) => e.name === 'Order')

    expect(orderEntity?.sourceLocation).toEqual({ repository: 'test-repo', filePath: 'unknown' })
  })

  it('merges entity metadata (invariants and description) from domain metadata', () => {
    const graph = createMinimalGraph({
      metadata: {
        domains: parseDomainMetadata({
          'order-domain': {
            description: 'Orders',
            systemType: 'domain',
            entities: {
              Order: {
                description: 'Represents a customer order',
                invariants: ['Must have at least one item', 'Total must be positive'],
              },
              Payment: {
                description: 'Payment information',
                invariants: ['Amount must match order total'],
              },
            },
          },
        }),
      },
      components: [
        createNode({
          id: 'op-1',
          type: 'DomainOp',
          name: 'Order.begin()',
          domain: 'order-domain',
          entity: 'Order',
          operationName: 'begin',
        }),
        createNode({
          id: 'op-2',
          type: 'DomainOp',
          name: 'Payment.process()',
          domain: 'order-domain',
          entity: 'Payment',
          operationName: 'process',
        }),
      ],
    })

    const result = extractDomainDetails(graph, parseDomainKey('order-domain'))

    const orderEntity = result?.entities.find((e) => e.name === 'Order')
    expect(orderEntity?.description).toBe('Represents a customer order')
    expect(orderEntity?.invariants).toEqual(['Must have at least one item', 'Total must be positive'])

    const paymentEntity = result?.entities.find((e) => e.name === 'Payment')
    expect(paymentEntity?.description).toBe('Payment information')
    expect(paymentEntity?.invariants).toEqual(['Amount must match order total'])
  })

  it('returns empty invariants when entity has no metadata', () => {
    const graph = createMinimalGraph({
      metadata: {
        domains: parseDomainMetadata({
          'order-domain': { description: 'Orders', systemType: 'domain' },
        }),
      },
      components: [
        createNode({
          id: 'op-1',
          type: 'DomainOp',
          name: 'Order.begin()',
          domain: 'order-domain',
          entity: 'Order',
          operationName: 'begin',
        }),
      ],
    })

    const result = extractDomainDetails(graph, parseDomainKey('order-domain'))

    const orderEntity = result?.entities.find((e) => e.name === 'Order')
    expect(orderEntity?.description).toBeUndefined()
    expect(orderEntity?.invariants).toEqual([])
  })
})
