import { assert, describe, expect, it } from 'vitest'
import { parseAsyncApiMappings } from './asyncapi-mappings'

describe('parseAsyncApiMappings', () => {
  it('returns canonical mappings from a complete document', () => {
    const result = parseAsyncApiMappings({
      messages: {
        OrderPlacedMessage: {
          domain: 'orders-domain',
          module: 'infrastructure',
          name: 'OrderPlaced',
        },
      },
      operations: {
        processOrder: {
          type: 'UseCase',
          domain: 'orders-domain',
          module: 'consumer/order-placed',
          name: 'ProcessOrder',
        },
      },
    })

    expect(result).toStrictEqual({
      success: true,
      mappings: {
        messages: {
          OrderPlacedMessage: {
            domain: 'orders-domain',
            module: 'infrastructure',
            name: 'OrderPlaced',
          },
        },
        operations: {
          processOrder: {
            type: 'UseCase',
            domain: 'orders-domain',
            module: 'consumer/order-placed',
            name: 'ProcessOrder',
          },
        },
      },
    })
  })

  it('defaults every section to empty when the document omits them', () => {
    const result = parseAsyncApiMappings({})

    expect(result).toStrictEqual({
      success: true,
      mappings: { messages: {}, operations: {} },
    })
  })

  it('rejects unknown keys with their path', () => {
    const result = parseAsyncApiMappings({ unexpected: true })

    assert(!result.success)
    expect(result.issues).toHaveLength(1)
    expect(result.issues[0]).toContain('unexpected')
  })

  it('rejects an empty message name with its path', () => {
    const result = parseAsyncApiMappings({
      messages: { OrderPlacedMessage: { domain: 'orders', module: 'infra', name: '' } },
    })

    assert(!result.success)
    expect(result.issues[0]).toContain('messages.OrderPlacedMessage.name')
  })

  it('rejects an operation mapping with an unsupported component type', () => {
    const result = parseAsyncApiMappings({
      operations: {
        processOrder: { type: 'Custom', domain: 'orders', module: 'checkout', name: 'Process' },
      },
    })

    assert(!result.success)
    expect(result.issues[0]).toContain('operations.processOrder.type')
  })

  it('accepts each supported operation component type', () => {
    for (const type of ['API', 'UseCase', 'DomainOp', 'Event', 'EventHandler'] as const) {
      const result = parseAsyncApiMappings({
        operations: { op: { type, domain: 'orders', module: 'checkout', name: 'Op' } },
      })

      assert(result.success)
      expect(result.mappings.operations.op?.type).toBe(type)
    }
  })
})
