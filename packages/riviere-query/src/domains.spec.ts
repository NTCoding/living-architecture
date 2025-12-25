import { describe, it, expect } from 'vitest'
import { RiviereQuery } from './RiviereQuery'
import { createMinimalValidGraph, createAPIComponent, createUseCaseComponent } from './graph-test-builders'

describe('domains', () => {
  it('returns domain with name, description, and systemType from metadata', () => {
    const graph = createMinimalValidGraph()
    const query = new RiviereQuery(graph)

    const result = query.domains()

    expect(result).toEqual([
      {
        name: 'test',
        description: 'Test domain',
        systemType: 'domain',
        componentCounts: {
          UI: 1,
          API: 0,
          UseCase: 0,
          DomainOp: 0,
          Event: 0,
          EventHandler: 0,
          Custom: 0,
          total: 1,
        },
      },
    ])
  })

  it('returns multiple domains with correct component counts per type', () => {
    const graph = createMinimalValidGraph()
    graph.metadata.domains['orders'] = { description: 'Order management', systemType: 'domain' }
    graph.metadata.domains['shipping'] = { description: 'Shipping integration', systemType: 'bff' }
    graph.components.push(
      createAPIComponent({ id: 'orders:api:create', name: 'Create Order', domain: 'orders' }),
      createAPIComponent({ id: 'orders:api:get', name: 'Get Order', domain: 'orders' }),
      createUseCaseComponent({ id: 'orders:usecase:checkout', name: 'Checkout', domain: 'orders' }),
      createAPIComponent({ id: 'shipping:api:track', name: 'Track', domain: 'shipping' }),
    )
    const query = new RiviereQuery(graph)

    const result = query.domains()

    const orders = result.find((d) => d.name === 'orders')
    expect(orders).toEqual({
      name: 'orders',
      description: 'Order management',
      systemType: 'domain',
      componentCounts: {
        UI: 0,
        API: 2,
        UseCase: 1,
        DomainOp: 0,
        Event: 0,
        EventHandler: 0,
        Custom: 0,
        total: 3,
      },
    })

    const shipping = result.find((d) => d.name === 'shipping')
    expect(shipping?.systemType).toBe('bff')
    expect(shipping?.componentCounts.API).toBe(1)
    expect(shipping?.componentCounts.total).toBe(1)
  })

  it('throws when graph has no domains (invalid per schema)', () => {
    const graph = createMinimalValidGraph()
    graph.metadata.domains = {}
    graph.components = []

    expect(() => new RiviereQuery(graph)).toThrow()
  })
})
