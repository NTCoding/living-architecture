import {
  describe, expect, it 
} from 'vitest'
import { ConnectionDetectionError } from './connection-detection-error'
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

  it('rewrites link to external when serviceName is a label instead of the internal domain key', () => {
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

  it('rewrites link to external when serviceName matches api name but route metadata contradicts it', () => {
    const filePath = '/src/http.ts'
    const source = buildComponent('PlaceOrder', filePath, 1)
    const httpCall = buildComponent('check', filePath, 2, {
      type: 'httpCall',
      metadata: {
        serviceName: 'FraudGateway',
        route: '/api/check',
        method: 'POST',
      },
    })
    const internalApi = buildComponent('FraudGateway', filePath, 3, {
      type: 'api',
      metadata: {
        route: '/different-route',
        method: 'POST',
      },
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

  it('throws when httpCall method metadata is invalid', () => {
    const filePath = '/src/http.ts'
    const source = buildComponent('PlaceOrder', filePath, 1)
    const target = buildComponent('check', filePath, 2, {
      type: 'httpCall',
      metadata: {
        serviceName: 'Fraud Detection Service',
        method: 123,
      },
    })

    expect(() =>
      rewriteHttpCallLinks(
        [
          {
            source: 'orders:useCase:PlaceOrder',
            target: 'orders:httpCall:check',
            type: 'sync',
          },
        ],
        [source, target],
      ),
    ).toThrowError(/method/)
    expect(() =>
      rewriteHttpCallLinks(
        [
          {
            source: 'orders:useCase:PlaceOrder',
            target: 'orders:httpCall:check',
            type: 'sync',
          },
        ],
        [source, target],
      ),
    ).toThrow(ConnectionDetectionError)
  })

  it('deduplicates identical kept internal links', () => {
    const filePath = '/src/http.ts'
    const source = buildComponent('PlaceOrder', filePath, 1)
    const target = buildComponent('FraudGateway', filePath, 2, { type: 'api' })

    const result = rewriteHttpCallLinks(
      [
        {
          source: 'orders:useCase:PlaceOrder',
          target: 'orders:api:FraudGateway',
          type: 'sync',
        },
        {
          source: 'orders:useCase:PlaceOrder',
          target: 'orders:api:FraudGateway',
          type: 'sync',
        },
      ],
      [source, target],
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
})
