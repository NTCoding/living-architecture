import {
  describe, it, expect 
} from 'vitest'
import { RiviereQuery } from './queries/RiviereQuery'
import {
  createMinimalValidGraph,
  createAPIComponent,
  createUseCaseComponent,
  assertDefined,
} from './platform/__fixtures__/riviere-graph-fixtures'

describe('domains', () => {
  it('returns domain with name, description, and systemType from metadata', () => {
    const graph = createMinimalValidGraph()
    const query = new RiviereQuery(graph)

    const result = query.domains()

    expect(result).toStrictEqual([
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
    graph.metadata.domains['orders'] = {
      description: 'Order management',
      systemType: 'domain',
    }
    graph.metadata.domains['shipping'] = {
      description: 'Shipping integration',
      systemType: 'bff',
    }
    graph.components.push(
      createAPIComponent({
        id: 'orders:api:create',
        name: 'Create Order',
        domain: 'orders',
      }),
      createAPIComponent({
        id: 'orders:api:get',
        name: 'Get Order',
        domain: 'orders',
      }),
      createUseCaseComponent({
        id: 'orders:usecase:checkout',
        name: 'Checkout',
        domain: 'orders',
      }),
      createAPIComponent({
        id: 'shipping:api:track',
        name: 'Track',
        domain: 'shipping',
      }),
    )
    const query = new RiviereQuery(graph)

    const result = query.domains()

    const orders = result.find((d) => d.name === 'orders')
    expect(orders).toStrictEqual({
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

    expect(() => new RiviereQuery(graph)).toThrow(/must NOT have fewer than 1 properties/i)
  })

  it('does not include external systems in domains (use externalSystems() instead)', () => {
    const graph = createMinimalValidGraph()
    graph.externalLinks = [
      {
        source: 'test:mod:ui:page',
        target: { name: 'Stripe' },
        type: 'sync',
      },
      {
        source: 'test:mod:ui:page',
        target: { name: 'Twilio' },
        type: 'async',
      },
    ]
    const query = new RiviereQuery(graph)

    const result = query.domains()

    expect(result.find((d) => d.name === 'external')).toBeUndefined()
    expect(result.find((d) => d.name === 'Stripe')).toBeUndefined()
    expect(result.find((d) => d.name === 'Twilio')).toBeUndefined()
  })
})

describe('assertDefined', () => {
  it('returns value when defined', () => {
    const value = assertDefined('test')

    expect(value).toBe('test')
  })

  it('throws when value is undefined', () => {
    expect(() => assertDefined(undefined)).toThrow('Expected value to be defined')
  })

  it('throws when value is null', () => {
    expect(() => assertDefined(null)).toThrow('Expected value to be defined')
  })

  it('throws with custom message', () => {
    expect(() => assertDefined(null, 'Custom error')).toThrow('Custom error')
  })
})
