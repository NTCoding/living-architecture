import {
  describe, it, expect 
} from 'vitest'
import { extractDomainDetails } from './extractDomainDetails'
import {
  parseNode,
  parseDomainMetadata,
  parseDomainKey,
  type RawNode,
} from '@/platform/infra/__fixtures__/riviere-test-fixtures'
import type { RiviereGraph } from '@living-architecture/riviere-schema'

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

describe('extractDomainDetails entities extraction', () => {
  it('extracts unique entities with their operations', () => {
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
    expect(orderEntity?.operations.map((op) => op.operationName)).toStrictEqual([
      'begin',
      'confirm',
    ])

    const orderItemEntity = result?.entities.find((e) => e.name === 'OrderItem')
    expect(orderItemEntity?.operations.map((op) => op.operationName)).toStrictEqual(['add'])
  })

  it('sorts entities alphabetically and operations alphabetically', () => {
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
          id: 'op-1',
          type: 'DomainOp',
          name: 'Zebra.z()',
          domain: 'order-domain',
          entity: 'Zebra',
          operationName: 'z',
        }),
        createNode({
          id: 'op-2',
          type: 'DomainOp',
          name: 'Apple.b()',
          domain: 'order-domain',
          entity: 'Apple',
          operationName: 'b',
        }),
        createNode({
          id: 'op-3',
          type: 'DomainOp',
          name: 'Apple.a()',
          domain: 'order-domain',
          entity: 'Apple',
          operationName: 'a',
        }),
      ],
    })

    const result = extractDomainDetails(graph, parseDomainKey('order-domain'))

    expect(result?.entities.map((e) => e.name)).toStrictEqual(['Apple', 'Zebra'])
    expect(result?.entities[0]?.operations.map((op) => op.operationName)).toStrictEqual(['a', 'b'])
  })

  it('returns empty array when no entities', () => {
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
          name: 'API',
          domain: 'order-domain',
        }),
      ],
    })

    const result = extractDomainDetails(graph, parseDomainKey('order-domain'))

    expect(result?.entities).toStrictEqual([])
  })

  it('includes sourceLocation on first operation', () => {
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
          id: 'op-1',
          type: 'DomainOp',
          name: 'Order.begin()',
          domain: 'order-domain',
          entity: 'Order',
          operationName: 'begin',
          sourceLocation: {
            repository: 'test-repo',
            filePath: 'src/Order.ts',
            lineNumber: 10,
          },
        }),
        createNode({
          id: 'op-2',
          type: 'DomainOp',
          name: 'Order.confirm()',
          domain: 'order-domain',
          entity: 'Order',
          operationName: 'confirm',
          sourceLocation: {
            repository: 'test-repo',
            filePath: 'src/Order.ts',
            lineNumber: 30,
          },
        }),
      ],
    })

    const result = extractDomainDetails(graph, parseDomainKey('order-domain'))
    const orderEntity = result?.entities.find((e) => e.name === 'Order')

    expect(orderEntity?.operations[0]?.sourceLocation).toStrictEqual({
      repository: 'test-repo',
      filePath: 'src/Order.ts',
      lineNumber: 10,
    })
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
      sourceLocation: {
        repository: 'test-repo',
        filePath: 'unknown',
      },
    }
    const graph = createMinimalGraph({
      metadata: {
        domains: parseDomainMetadata({
          'order-domain': {
            description: 'Orders',
            systemType: 'domain',
          },
        }),
      },
      components: [parseNode(rawNode)],
    })

    const result = extractDomainDetails(graph, parseDomainKey('order-domain'))
    const orderEntity = result?.entities.find((e) => e.name === 'Order')

    expect(orderEntity?.operations[0]?.sourceLocation).toStrictEqual({
      repository: 'test-repo',
      filePath: 'unknown',
    })
  })

  it('returns empty businessRules when operations have no businessRules', () => {
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
    expect(orderEntity?.businessRules).toStrictEqual([])
  })
})
