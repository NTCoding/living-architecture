import { assert, describe, expect, it } from 'vitest'
import { parseEventCatalogMappings } from './eventcatalog-mappings'

describe('parseEventCatalogMappings', () => {
  it('returns canonical mappings from a complete document', () => {
    const result = parseEventCatalogMappings({
      domains: { OrdersDomain: 'orders' },
      services: {
        OrdersService: {
          type: 'UseCase',
          domain: 'orders',
          module: 'checkout',
          name: 'PlaceOrder',
        },
      },
      events: { OrderCreated: { name: 'OrderPlaced' } },
    })

    expect(result).toStrictEqual({
      success: true,
      mappings: {
        domains: { OrdersDomain: 'orders' },
        services: {
          OrdersService: {
            type: 'UseCase',
            domain: 'orders',
            module: 'checkout',
            name: 'PlaceOrder',
          },
        },
        events: { OrderCreated: { name: 'OrderPlaced' } },
      },
    })
  })

  it('defaults every section to empty when the document omits them', () => {
    const result = parseEventCatalogMappings({})

    expect(result).toStrictEqual({
      success: true,
      mappings: { domains: {}, services: {}, events: {} },
    })
  })

  it('rejects unknown keys with their path', () => {
    const result = parseEventCatalogMappings({ unexpected: true })

    assert(!result.success)
    expect(result.issues).toHaveLength(1)
    expect(result.issues[0]).toContain('unexpected')
  })

  it('rejects an empty service name with its path', () => {
    const result = parseEventCatalogMappings({
      services: {
        OrdersService: { type: 'UseCase', domain: 'orders', module: 'checkout', name: '' },
      },
    })

    assert(!result.success)
    expect(result.issues[0]).toContain('services.OrdersService.name')
  })

  it('rejects an unsupported service component type', () => {
    const result = parseEventCatalogMappings({
      services: {
        OrdersService: { type: 'Event', domain: 'orders', module: 'checkout', name: 'X' },
      },
    })

    assert(!result.success)
    expect(result.issues[0]).toContain('services.OrdersService.type')
  })
})
