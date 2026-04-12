import {
  describe, expect, it 
} from 'vitest'
import { buildComponent } from './call-graph/call-graph-fixtures'
import { rewriteHttpCallLinks } from './http-call-link-rewrite'

describe('rewriteHttpCallLinks - global and fallback resolution', () => {
  it('keeps internal link when httpCall has only serviceName and api name matches uniquely', () => {
    const filePath = '/src/http.ts'
    const source = buildComponent('PlaceOrder', filePath, 1)
    const httpCall = buildComponent('check', filePath, 2, {
      type: 'httpCall',
      metadata: { serviceName: 'FraudGateway' },
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

  it('keeps internal link when api-name fallback matches on method and route is absent', () => {
    const filePath = '/src/http.ts'
    const source = buildComponent('PlaceOrder', filePath, 1)
    const httpCall = buildComponent('check', filePath, 2, {
      type: 'httpCall',
      metadata: {
        serviceName: 'FraudGateway',
        method: 'POST',
      },
    })
    const internalApi = buildComponent('FraudGateway', filePath, 3, {
      type: 'api',
      metadata: { method: 'POST' },
    })

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

  it('rewrites link to external when serviceName is only a label even if route and method match an internal api', () => {
    const filePath = '/src/http.ts'
    const source = buildComponent('PlaceOrderBFFUseCase', filePath, 1, { domain: 'bff' })
    const httpCall = buildComponent('placeOrder', filePath, 2, {
      type: 'httpCall',
      domain: 'bff',
      metadata: {
        serviceName: 'Inventory Service',
        route: '/inventory/:sku',
        method: 'GET',
      },
    })
    const inventoryApi = buildComponent('CheckStockEndpoint', '/src/inventory/api.ts', 3, {
      type: 'api',
      domain: 'inventory',
      metadata: {
        route: '/inventory/:sku',
        method: 'GET',
      },
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

    expect(result.links).toStrictEqual([])
    expect(result.externalLinks).toStrictEqual([
      {
        source: 'bff:useCase:PlaceOrderBFFUseCase',
        target: {
          name: 'Inventory Service',
          route: '/inventory/:sku',
        },
        type: 'sync',
      },
    ])
  })
})
