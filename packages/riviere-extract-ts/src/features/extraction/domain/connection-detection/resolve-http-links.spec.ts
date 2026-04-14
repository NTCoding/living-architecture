import {
  describe, it, expect 
} from 'vitest'
import type { HttpLinkConfig } from '@living-architecture/riviere-extract-config'
import type { EnrichedComponent } from '../value-extraction/enrich-components'
import type { ExtractedLink } from './extracted-link'
import {
  resolveHttpLinks, stripResolvedCustomTypes 
} from './resolve-http-links'
import { buildComponent } from './call-graph/call-graph-fixtures'

function createHttpLinkConfig(overrides: Partial<HttpLinkConfig> = {}): HttpLinkConfig {
  return {
    fromCustomType: 'httpCall',
    matchDomainBy: 'serviceName',
    matchApiBy: ['route'],
    ...overrides,
  }
}

function createLink(overrides: Partial<ExtractedLink> = {}): ExtractedLink {
  return {
    source: 'bff:bff-module:useCase:placeorder',
    target: 'bff:bff-module:httpCall:placeorder',
    type: 'sync',
    ...overrides,
  }
}

function httpCallComponent(name: string, metadata: Record<string, string>): EnrichedComponent {
  return buildComponent(name, '/src/http.ts', 1, {
    type: 'httpCall',
    domain: 'bff',
    module: 'bff-module',
    metadata,
  })
}

function apiComponent(
  name: string,
  domain: string,
  metadata: Record<string, string>,
): EnrichedComponent {
  return buildComponent(name, '/src/api.ts', 1, {
    type: 'api',
    domain,
    module: `${domain}-module`,
    metadata,
  })
}

describe('resolveHttpLinks', () => {
  it('passes links through when no httpLink configs provided', () => {
    const link = createLink()
    const result = resolveHttpLinks([link], [], [])
    expect(result.links).toStrictEqual([link])
    expect(result.externalLinks).toStrictEqual([])
  })

  it('passes non-httpCall links through unchanged', () => {
    const link = createLink({ target: 'orders:orders-module:useCase:placeorder' })
    const useCase = buildComponent('PlaceOrder', '/src/uc.ts', 1)
    const config = createHttpLinkConfig()

    const result = resolveHttpLinks([link], [useCase], [config])

    expect(result.links).toStrictEqual([link])
    expect(result.externalLinks).toStrictEqual([])
  })

  it('rewrites link to API component when domain and route match', () => {
    const httpCall = httpCallComponent('placeOrder', {
      serviceName: 'orders',
      route: '/orders',
    })
    const api = apiComponent('createOrder', 'orders', { route: '/orders' })
    const link = createLink({ target: 'bff:bff-module:httpCall:placeorder' })
    const config = createHttpLinkConfig()

    const result = resolveHttpLinks([link], [httpCall, api], [config])

    expect(result.links).toHaveLength(1)
    expect(result.links[0]?.target).toBe('orders:orders-module:api:createorder')
    expect(result.externalLinks).toStrictEqual([])
  })

  it('creates external link when no domain matches', () => {
    const httpCall = httpCallComponent('checkFraud', {
      serviceName: 'Fraud Detection Service',
      route: '/api/check',
    })
    const link = createLink({ target: 'bff:bff-module:httpCall:checkfraud' })
    const config = createHttpLinkConfig()

    const result = resolveHttpLinks([link], [httpCall], [config])

    expect(result.links).toStrictEqual([])
    expect(result.externalLinks).toHaveLength(1)
    expect(result.externalLinks[0]).toMatchObject({
      source: link.source,
      target: {
        name: 'Fraud Detection Service',
        route: '/api/check',
      },
    })
  })

  it('creates external link when domain exists but no API route matches', () => {
    const httpCall = httpCallComponent('getWidget', {
      serviceName: 'orders',
      route: '/nonexistent',
    })
    const api = apiComponent('createOrder', 'orders', { route: '/orders' })
    const link = createLink({ target: 'bff:bff-module:httpCall:getwidget' })
    const config = createHttpLinkConfig()

    const result = resolveHttpLinks([link], [httpCall, api], [config])

    expect(result.links).toStrictEqual([])
    expect(result.externalLinks).toHaveLength(1)
  })

  it('includes sourceLocation on external link when present', () => {
    const httpCall = httpCallComponent('checkFraud', {
      serviceName: 'External Service',
      route: '/check',
    })
    const link = createLink({
      target: 'bff:bff-module:httpCall:checkfraud',
      sourceLocation: {
        repository: 'test-repo',
        filePath: '/src/bff.ts',
        lineNumber: 10,
        methodName: 'execute',
      },
    })
    const config = createHttpLinkConfig()

    const result = resolveHttpLinks([link], [httpCall], [config])

    expect(result.externalLinks).toHaveLength(1)
    expect(result.externalLinks[0]?.sourceLocation).toBeDefined()
  })

  it('includes all matchApiBy metadata in external link target', () => {
    const httpCall = httpCallComponent('checkFraud', {
      serviceName: 'External Service',
      route: '/check',
      method: 'POST',
    })
    const link = createLink({ target: 'bff:bff-module:httpCall:checkfraud' })
    const config = createHttpLinkConfig({ matchApiBy: ['route', 'method'] })

    const result = resolveHttpLinks([link], [httpCall], [config])

    expect(result.externalLinks).toHaveLength(1)
    const target = result.externalLinks[0]?.target
    expect(target).toHaveProperty('name', 'External Service')
    expect(target).toHaveProperty('route', '/check')
    expect(target).toHaveProperty('method', 'POST')
  })

  it('passes link through when target has no serviceName metadata', () => {
    const httpCall = httpCallComponent('noMeta', {})
    const link = createLink({ target: 'bff:bff-module:httpCall:nometa' })
    const config = createHttpLinkConfig()

    const result = resolveHttpLinks([link], [httpCall], [config])

    expect(result.links).toStrictEqual([link])
    expect(result.externalLinks).toStrictEqual([])
  })

  it('creates external link when httpCall is missing matchApiBy metadata', () => {
    const httpCall = httpCallComponent('placeOrder', { serviceName: 'orders' })
    const api = apiComponent('createOrder', 'orders', { route: '/orders' })
    const link = createLink({ target: 'bff:bff-module:httpCall:placeorder' })
    const config = createHttpLinkConfig()

    const result = resolveHttpLinks([link], [httpCall, api], [config])

    expect(result.links).toStrictEqual([])
    expect(result.externalLinks).toHaveLength(1)
  })

  it('matches API when matchApiBy key is missing from API metadata', () => {
    const httpCall = httpCallComponent('placeOrder', {
      serviceName: 'orders',
      route: '/orders',
      method: 'POST',
    })
    const api = apiComponent('createOrder', 'orders', { route: '/orders' })
    const link = createLink({ target: 'bff:bff-module:httpCall:placeorder' })
    const config = createHttpLinkConfig({ matchApiBy: ['route', 'method'] })

    const result = resolveHttpLinks([link], [httpCall, api], [config])

    expect(result.links).toHaveLength(1)
    expect(result.links[0]?.target).toBe('orders:orders-module:api:createorder')
  })
  it('throws on ambiguous API match within domain', () => {
    const httpCall = httpCallComponent('placeOrder', {
      serviceName: 'orders',
      route: '/orders',
    })
    const api1 = apiComponent('createOrder', 'orders', { route: '/orders' })
    const api2 = apiComponent('placeOrder', 'orders', { route: '/orders' })
    const link = createLink({ target: 'bff:bff-module:httpCall:placeorder' })
    const config = createHttpLinkConfig()

    expect(() => resolveHttpLinks([link], [httpCall, api1, api2], [config])).toThrow(
      /Ambiguous HTTP link/,
    )
  })
})

describe('stripResolvedCustomTypes', () => {
  it('removes components matching httpLink custom types', () => {
    const useCase = buildComponent('PlaceOrder', '/src/uc.ts', 1)
    const httpCall = buildComponent('check', '/src/http.ts', 1, { type: 'httpCall' })
    const config = createHttpLinkConfig()

    const result = stripResolvedCustomTypes([useCase, httpCall], [config], [])

    expect(result).toStrictEqual([useCase])
  })

  it('keeps httpCall component when a link still targets it', () => {
    const useCase = buildComponent('PlaceOrder', '/src/uc.ts', 1)
    const httpCall = buildComponent('check', '/src/http.ts', 1, { type: 'httpCall' })
    const config = createHttpLinkConfig()
    const linkTargetingHttpCall: ExtractedLink = {
      source: 'bff:bff-module:useCase:placeorder',
      target: 'orders:orders-module:httpCall:check',
      type: 'sync',
    }

    const result = stripResolvedCustomTypes([useCase, httpCall], [config], [linkTargetingHttpCall])

    expect(result).toHaveLength(2)
  })

  it('keeps all components when no httpLink configs', () => {
    const useCase = buildComponent('PlaceOrder', '/src/uc.ts', 1)
    const result = stripResolvedCustomTypes([useCase], [], [])
    expect(result).toStrictEqual([useCase])
  })
})
