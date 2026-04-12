import {
  describe, it, expect 
} from 'vitest'
import { buildComponent } from './call-graph/call-graph-fixtures'
import { ConnectionDetectionError } from './connection-detection-error'
import {
  rewriteHttpCallLinks, stripHttpCallComponents 
} from './http-call-link-rewrite'

describe('rewriteHttpCallLinks', () => {
  it('rewrites links targeting httpCall components into external links', () => {
    const filePath = '/src/http.ts'
    const source = buildComponent('PlaceOrder', filePath, 1)
    const target = buildComponent('check', filePath, 2, {
      type: 'httpCall',
      metadata: {
        serviceName: 'Fraud Detection Service',
        route: '/api/check',
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
      [source, target],
    )

    expect(result.links).toStrictEqual([])
    expect(result.externalLinks).toStrictEqual([
      {
        source: 'orders:useCase:PlaceOrder',
        target: {
          name: 'Fraud Detection Service',
          route: '/api/check',
        },
        type: 'sync',
      },
    ])
  })

  it('keeps non-httpCall links unchanged', () => {
    const filePath = '/src/http.ts'
    const source = buildComponent('PlaceOrder', filePath, 1)
    const target = buildComponent('OrderRepository', filePath, 2, { type: 'repository' })

    const links = [
      {
        source: 'orders:useCase:PlaceOrder',
        target: 'orders:repository:OrderRepository',
        type: 'sync' as const,
      },
    ]

    const result = rewriteHttpCallLinks(links, [source, target])

    expect(result.links).toStrictEqual(links)
    expect(result.externalLinks).toStrictEqual([])
  })

  it('keeps internal link when httpCall serviceName matches internal component name', () => {
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

    expect(result.links).toStrictEqual([
      {
        source: 'orders:useCase:PlaceOrder',
        target: 'orders:repository:FraudGateway',
        type: 'sync',
      },
    ])
    expect(result.externalLinks).toStrictEqual([])
  })

  it('keeps internal link when httpCall serviceName matches internal domain and route matches a unique api component', () => {
    const filePath = '/src/http.ts'
    const source = buildComponent('PlaceOrderBFFUseCase', filePath, 1, { domain: 'bff' })
    const httpCall = buildComponent('placeOrder', filePath, 2, {
      type: 'httpCall',
      domain: 'bff',
      metadata: {
        serviceName: 'orders',
        route: '/orders',
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

  it('rewrites link to external when httpCall serviceName matches internal domain but route does not match any api component', () => {
    const filePath = '/src/http.ts'
    const source = buildComponent('PlaceOrderBFFUseCase', filePath, 1, { domain: 'bff' })
    const httpCall = buildComponent('placeOrder', filePath, 2, {
      type: 'httpCall',
      domain: 'bff',
      metadata: {
        serviceName: 'orders',
        route: '/payments',
      },
    })
    const ordersApi = buildComponent('handle', filePath, 3, {
      type: 'api',
      domain: 'orders',
      metadata: { route: '/orders' },
    })
    const cancelOrderApi = buildComponent('cancel', filePath, 4, {
      type: 'api',
      domain: 'orders',
      metadata: { route: '/orders/:id/cancel' },
    })

    const result = rewriteHttpCallLinks(
      [
        {
          source: 'bff:useCase:PlaceOrderBFFUseCase',
          target: 'bff:httpCall:placeOrder',
          type: 'sync',
        },
      ],
      [source, httpCall, ordersApi, cancelOrderApi],
    )

    expect(result.links).toStrictEqual([])
    expect(result.externalLinks).toStrictEqual([
      {
        source: 'bff:useCase:PlaceOrderBFFUseCase',
        target: {
          name: 'orders',
          route: '/payments',
        },
        type: 'sync',
      },
    ])
  })

  it('rewrites link to external when httpCall serviceName matches internal domain but route matches multiple api components', () => {
    const filePath = '/src/http.ts'
    const source = buildComponent('PlaceOrderBFFUseCase', filePath, 1, { domain: 'bff' })
    const httpCall = buildComponent('placeOrder', filePath, 2, {
      type: 'httpCall',
      domain: 'bff',
      metadata: {
        serviceName: 'orders',
        route: '/orders',
      },
    })
    const ordersApi = buildComponent('handle', filePath, 3, {
      type: 'api',
      domain: 'orders',
      metadata: { route: '/orders' },
    })
    const duplicateOrdersApi = buildComponent('create', filePath, 4, {
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
      [source, httpCall, ordersApi, duplicateOrdersApi],
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

  it('throws when httpCall serviceName matches multiple internal components', () => {
    const filePath = '/src/http.ts'
    const source = buildComponent('PlaceOrder', filePath, 1)
    const httpCall = buildComponent('check', filePath, 2, {
      type: 'httpCall',
      metadata: { serviceName: 'FraudGateway' },
    })
    const repositoryTarget = buildComponent('FraudGateway', filePath, 3, { type: 'repository' })
    const useCaseTarget = buildComponent('FraudGateway', filePath, 4, { type: 'useCase' })

    expect(() =>
      rewriteHttpCallLinks(
        [
          {
            source: 'orders:useCase:PlaceOrder',
            target: 'orders:httpCall:check',
            type: 'sync',
          },
        ],
        [source, httpCall, repositoryTarget, useCaseTarget],
      ),
    ).toThrowError(/exactly one internal component/)
    expect(() =>
      rewriteHttpCallLinks(
        [
          {
            source: 'orders:useCase:PlaceOrder',
            target: 'orders:httpCall:check',
            type: 'sync',
          },
        ],
        [source, httpCall, repositoryTarget, useCaseTarget],
      ),
    ).toThrow(ConnectionDetectionError)
  })

  it('throws when httpCall serviceName metadata is missing', () => {
    const filePath = '/src/http.ts'
    const source = buildComponent('PlaceOrder', filePath, 1)
    const target = buildComponent('check', filePath, 2, {
      type: 'httpCall',
      metadata: {},
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
    ).toThrowError(/serviceName/)
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

  it('throws when httpCall route metadata is invalid', () => {
    const filePath = '/src/http.ts'
    const source = buildComponent('PlaceOrder', filePath, 1)
    const target = buildComponent('check', filePath, 2, {
      type: 'httpCall',
      metadata: {
        serviceName: 'Fraud Detection Service',
        route: 123,
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
    ).toThrowError(/route/)
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

  it('omits type when input link has undefined type and keeps source location', () => {
    const filePath = '/src/http.ts'
    const source = buildComponent('PlaceOrder', filePath, 1)
    const target = buildComponent('check', filePath, 2, {
      type: 'httpCall',
      metadata: { serviceName: 'Fraud Detection Service' },
    })

    const result = rewriteHttpCallLinks(
      [
        {
          source: 'orders:useCase:PlaceOrder',
          target: 'orders:httpCall:check',
          sourceLocation: {
            repository: 'test-repo',
            filePath,
            lineNumber: 10,
            methodName: 'execute',
          },
        },
      ],
      [source, target],
    )

    expect(result.links).toStrictEqual([])
    expect(result.externalLinks).toStrictEqual([
      {
        source: 'orders:useCase:PlaceOrder',
        target: { name: 'Fraud Detection Service' },
        sourceLocation: {
          repository: 'test-repo',
          filePath,
          lineNumber: 10,
          methodName: 'execute',
        },
      },
    ])
  })
})

describe('stripHttpCallComponents', () => {
  it('removes httpCall components from final list', () => {
    const filePath = '/src/http.ts'
    const useCase = buildComponent('PlaceOrder', filePath, 1)
    const httpCall = buildComponent('check', filePath, 2, {
      type: 'httpCall',
      metadata: { serviceName: 'Fraud Detection Service' },
    })

    const result = stripHttpCallComponents([useCase, httpCall])
    expect(result).toStrictEqual([useCase])
  })
})
