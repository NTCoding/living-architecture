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

  it('rewrites link to external when api-name fallback candidate has no route or method metadata', () => {
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

  it('keeps internal link when api-name fallback candidate matches route and method metadata', () => {
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
        route: '/api/check',
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

    expect(result.links).toStrictEqual([
      {
        source: 'orders:useCase:PlaceOrder',
        target: 'orders:api:FraudGateway',
        type: 'sync',
      },
    ])
    expect(result.externalLinks).toStrictEqual([])
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

  it('keeps internal link when route uniquely matches an api without method metadata', () => {
    const filePath = '/src/http.ts'
    const source = buildComponent('PlaceOrderBFFUseCase', filePath, 1, { domain: 'bff' })
    const httpCall = buildComponent('placeOrder', filePath, 2, {
      type: 'httpCall',
      domain: 'bff',
      metadata: {
        serviceName: 'orders',
        route: '/orders',
        method: 'POST',
      },
    })
    const internalTarget = buildComponent('handle', filePath, 3, {
      type: 'api',
      domain: 'orders',
      metadata: { route: '/orders' },
    })

    const result = rewriteHttpCallLinks(
      [
        {
          source: 'bff:useCase:PlaceOrderBFFUseCase',
          target: 'bff:httpCall:placeOrder',
          type: 'sync',
        },
      ],
      [source, httpCall, internalTarget],
    )

    expect(result.links).toStrictEqual([
      {
        source: 'bff:useCase:PlaceOrderBFFUseCase',
        target: 'orders:api:handle',
        type: 'sync',
      },
    ])
    expect(result.externalLinks).toStrictEqual([])
  })

  it('rewrites link to external when httpCall serviceName matches multiple internal api components', () => {
    const filePath = '/src/http.ts'
    const source = buildComponent('PlaceOrder', filePath, 1)
    const httpCall = buildComponent('check', filePath, 2, {
      type: 'httpCall',
      metadata: { serviceName: 'FraudGateway' },
    })
    const firstApiTarget = buildComponent('FraudGateway', filePath, 3, { type: 'api' })
    const secondApiTarget = buildComponent('FraudGateway', filePath, 4, { type: 'api' })

    const result = rewriteHttpCallLinks(
      [
        {
          source: 'orders:useCase:PlaceOrder',
          target: 'orders:httpCall:check',
          type: 'sync',
        },
      ],
      [source, httpCall, firstApiTarget, secondApiTarget],
    )

    expect(result.links).toStrictEqual([])
    expect(result.externalLinks).toStrictEqual([
      {
        source: 'orders:useCase:PlaceOrder',
        target: { name: 'FraudGateway' },
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

  it('rewrites link to external when multiple apis share the same route and method', () => {
    const filePath = '/src/http.ts'
    const source = buildComponent('PlaceOrderBFFUseCase', filePath, 1, { domain: 'bff' })
    const httpCall = buildComponent('placeOrder', filePath, 2, {
      type: 'httpCall',
      domain: 'bff',
      metadata: {
        serviceName: 'orders',
        route: '/orders',
        method: 'POST',
      },
    })
    const firstApi = buildComponent('createOrder', filePath, 3, {
      type: 'api',
      domain: 'orders',
      metadata: {
        route: '/orders',
        method: 'POST',
      },
    })
    const secondApi = buildComponent('submitOrder', filePath, 4, {
      type: 'api',
      domain: 'orders',
      metadata: {
        route: '/orders',
        method: 'POST',
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
      [source, httpCall, firstApi, secondApi],
    )

    expect(result.links).toStrictEqual([])
    expect(result.externalLinks).toStrictEqual([
      {
        source: 'bff:useCase:PlaceOrderBFFUseCase',
        target: {
          name: 'orders',
          route: '/orders',
        },
        type: 'sync',
      },
    ])
  })
})
