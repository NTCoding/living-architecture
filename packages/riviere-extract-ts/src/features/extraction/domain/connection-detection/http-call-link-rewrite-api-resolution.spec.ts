import {
  describe, expect, it 
} from 'vitest'
import { buildComponent } from './call-graph/call-graph-fixtures'
import { rewriteHttpCallLinks } from './http-call-link-rewrite'

describe('rewriteHttpCallLinks - api resolution safety', () => {
  it('rewrites link to external when httpCall serviceName matches a non-api internal component name', () => {
    const filePath = '/src/http.ts'
    const source = buildComponent('PlaceOrder', filePath, 1)
    const httpCall = buildComponent('check', filePath, 2, {
      type: 'httpCall',
      metadata: {
        serviceName: 'FraudGateway',
        route: '/api/check',
      },
    })
    const internalTarget = buildComponent('FraudGateway', filePath, 3, { type: 'repository' })

    const result = rewriteHttpCallLinks(
      [
        {
          source: 'orders:useCase:PlaceOrder',
          target: 'orders:httpCall:check',
          type: 'sync',
        },
      ],
      [source, httpCall, internalTarget],
    )

    expect(result.links).toStrictEqual([])
    expect(result.externalLinks).toStrictEqual([
      {
        source: 'orders:useCase:PlaceOrder',
        target: {
          name: 'FraudGateway',
          route: '/api/check',
        },
        type: 'sync',
      },
    ])
  })

  it('keeps internal link when httpCall serviceName matches a unique internal api component name', () => {
    const filePath = '/src/http.ts'
    const source = buildComponent('PlaceOrder', filePath, 1)
    const httpCall = buildComponent('check', filePath, 2, {
      type: 'httpCall',
      metadata: {
        serviceName: 'FraudGateway',
        route: '/api/check',
      },
    })
    const internalApi = buildComponent('FraudGateway', filePath, 3, { type: 'api' })

    const result = rewriteHttpCallLinks(
      [
        {
          source: 'orders:useCase:PlaceOrder',
          target: 'orders:httpCall:check',
          type: 'sync',
        },
      ],
      [source, httpCall, internalApi],
    )

    expect(result.links).toStrictEqual([
      {
        source: 'orders:useCase:PlaceOrder',
        target: 'orders:api:FraudGateway',
        type: 'sync',
      },
    ])
    expect(result.externalLinks).toStrictEqual([])
  })

  it('keeps internal link when normalized serviceName label matches an internal domain route', () => {
    const filePath = '/src/http.ts'
    const source = buildComponent('PlaceOrderBFFUseCase', filePath, 1, { domain: 'bff' })
    const httpCall = buildComponent('placeOrder', filePath, 2, {
      type: 'httpCall',
      domain: 'bff',
      metadata: {
        serviceName: 'Inventory Service',
        route: '/inventory/:sku',
      },
    })
    const inventoryApi = buildComponent('CheckStockEndpoint', '/src/inventory/api.ts', 3, {
      type: 'api',
      domain: 'inventory',
      metadata: { route: '/inventory/:sku' },
    })

    const result = rewriteHttpCallLinks(
      [
        {
          source: 'bff:useCase:PlaceOrderBFFUseCase',
          target: 'bff:httpCall:placeOrder',
          type: 'sync',
        },
      ],
      [source, httpCall, inventoryApi],
    )

    expect(result.links).toStrictEqual([
      {
        source: 'bff:useCase:PlaceOrderBFFUseCase',
        target: 'inventory:api:CheckStockEndpoint',
        type: 'sync',
      },
    ])
    expect(result.externalLinks).toStrictEqual([])
  })
})
