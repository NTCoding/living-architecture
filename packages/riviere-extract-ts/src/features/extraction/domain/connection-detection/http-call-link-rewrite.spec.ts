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
        target: { name: 'Fraud Detection Service' },
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
