import type { RiviereGraph } from '@living-architecture/riviere-schema-published-language/schema'
import { describe, it, expect } from 'vitest'
import { ComponentSummaryStats } from './component-summary-stats'
import { RiviereQuery } from './RiviereQuery'

describe('ComponentSummaryStats', () => {
  it('returns an instance of ComponentSummaryStats from parse()', () => {
    const stats = ComponentSummaryStats.parse({
      componentCount: 0,
      componentsByType: {
        UI: 0,
        API: 0,
        UseCase: 0,
        DomainOp: 0,
        Event: 0,
        EventHandler: 0,
        Custom: 0,
      },
      linkCount: 0,
      externalLinkCount: 0,
      domainCount: 0,
    })

    expect(stats).toBeInstanceOf(ComponentSummaryStats)
  })

  it('stores all fields correctly', () => {
    const stats = ComponentSummaryStats.parse({
      componentCount: 5,
      componentsByType: {
        UI: 1,
        API: 2,
        UseCase: 1,
        DomainOp: 0,
        Event: 0,
        EventHandler: 1,
        Custom: 0,
      },
      linkCount: 3,
      externalLinkCount: 2,
      domainCount: 2,
    })

    expect(stats).toBeInstanceOf(ComponentSummaryStats)
    expect(stats.componentCount).toBe(5)
    expect(stats.linkCount).toBe(3)
    expect(stats.componentsByType.API).toBe(2)
  })

  it('stores zero counts correctly', () => {
    const stats = ComponentSummaryStats.parse({
      componentCount: 0,
      componentsByType: {
        UI: 0,
        API: 0,
        UseCase: 0,
        DomainOp: 0,
        Event: 0,
        EventHandler: 0,
        Custom: 0,
      },
      linkCount: 0,
      externalLinkCount: 0,
      domainCount: 0,
    })

    expect(stats.componentCount).toBe(0)
    expect(stats.linkCount).toBe(0)
    expect(stats.externalLinkCount).toBe(0)
    expect(stats.domainCount).toBe(0)
  })

  it('is not affected by mutations to the source object', () => {
    const source = {
      componentCount: 5,
      componentsByType: {
        UI: 1,
        API: 2,
        UseCase: 1,
        DomainOp: 0,
        Event: 0,
        EventHandler: 1,
        Custom: 0,
      },
      linkCount: 3,
      externalLinkCount: 2,
      domainCount: 2,
    }

    const stats = ComponentSummaryStats.parse(source)
    source.componentsByType.API = 999

    expect(stats.componentsByType.API).toBe(2)
  })

  it('calculates the complete component summary from graph values', () => {
    const sourceLocation = { repository: 'test/repo', filePath: 'src/test.ts' }
    const graph: RiviereGraph = {
      version: '1.0',
      metadata: {
        domains: {
          orders: { description: 'Orders', systemType: 'domain' },
          shipping: { description: 'Shipping', systemType: 'domain' },
        },
        customTypes: { policy: {} },
      },
      components: [
        {
          id: 'orders:web:ui:page',
          name: 'Page',
          domain: 'orders',
          module: 'web',
          type: 'UI',
          route: '/',
          sourceLocation,
        },
        {
          id: 'orders:web:api:get',
          name: 'Get',
          domain: 'orders',
          module: 'web',
          type: 'API',
          apiType: 'REST',
          httpMethod: 'GET',
          path: '/orders',
          sourceLocation,
        },
        {
          id: 'orders:core:use-case:place',
          name: 'Place',
          domain: 'orders',
          module: 'core',
          type: 'UseCase',
          sourceLocation,
        },
        {
          id: 'orders:core:domain-op:save',
          name: 'Save',
          domain: 'orders',
          module: 'core',
          type: 'DomainOp',
          operationName: 'save',
          sourceLocation,
        },
        {
          id: 'orders:core:event:placed',
          name: 'Placed',
          domain: 'orders',
          module: 'core',
          type: 'Event',
          eventName: 'Placed',
          sourceLocation,
        },
        {
          id: 'orders:core:event-handler:placed',
          name: 'Handle placed',
          domain: 'orders',
          module: 'core',
          type: 'EventHandler',
          subscribedEvents: ['Placed'],
          sourceLocation,
        },
        {
          id: 'orders:core:custom:policy',
          name: 'Policy',
          domain: 'orders',
          module: 'core',
          type: 'Custom',
          customTypeName: 'policy',
          sourceLocation,
        },
      ],
      links: [{ source: 'orders:web:ui:page', target: 'orders:web:api:get' }],
      externalLinks: [{ source: 'orders:web:api:get', target: { name: 'External' } }],
    }

    const stats = new RiviereQuery(graph).componentSummary()

    expect(stats).toMatchObject({
      componentsByType: {
        UI: 1,
        API: 1,
        UseCase: 1,
        DomainOp: 1,
        Event: 1,
        EventHandler: 1,
        Custom: 1,
      },
      componentCount: 7,
      linkCount: 1,
      externalLinkCount: 1,
      domainCount: 2,
    })
  })

  it('counts no external links when the graph omits them', () => {
    const graph: RiviereGraph = {
      version: '1.0',
      metadata: { domains: {} },
      components: [],
      links: [],
    }

    expect(ComponentSummaryStats.fromGraph(graph).externalLinkCount).toBe(0)
  })
})
