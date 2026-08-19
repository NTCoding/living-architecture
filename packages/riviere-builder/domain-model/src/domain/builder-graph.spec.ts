import { describe, expect, it } from 'vitest'
import type { ExternalLink } from '@living-architecture/riviere-schema-published-language/schema'
import { BuilderGraph } from './builder-graph'

describe('BuilderGraph', () => {
  it('mutates in place and returns the same instance', () => {
    const graph = BuilderGraph.parse({
      version: '1.0',
      metadata: {
        generated: '2026-08-12T00:00:00.000Z',
        sources: [{ repository: 'example/repository' }],
        domains: {
          orders: {
            description: 'Orders',
            systemType: 'domain',
          },
        },
        customTypes: {},
        relationshipTypes: {},
      },
      components: [],
      links: [],
      externalLinks: [],
    })

    const result = graph.withDomain('shipping', {
      description: 'Shipping',
      systemType: 'domain',
    })

    expect(result).toBe(graph)
    expect(graph.metadata.domains['shipping']).toStrictEqual({
      description: 'Shipping',
      systemType: 'domain',
    })
    expect(graph.metadata.generated).toBe('2026-08-12T00:00:00.000Z')
  })

  it('chains updates into successive graph values', () => {
    const graph = BuilderGraph.parse({
      version: '1.0',
      metadata: {
        sources: [{ repository: 'example/repository' }],
        domains: {
          orders: {
            description: 'Orders',
            systemType: 'domain',
          },
        },
        customTypes: {},
        relationshipTypes: {},
      },
      components: [],
      links: [],
      externalLinks: [],
    })

    graph
      .withDomain('shipping', {
        description: 'Shipping',
        systemType: 'domain',
      })
      .withComponent({
        id: 'shipping:delivery:ui:tracking',
        type: 'UI',
        name: 'Tracking',
        domain: 'shipping',
        module: 'delivery',
        route: '/tracking',
        sourceLocation: {
          repository: 'example/repository',
          filePath: 'tracking.ts',
        },
      })

    expect(graph.metadata.domains).toHaveProperty('shipping')
    expect(graph.components).toHaveLength(1)
  })

  it('O(1) component lookup via hasComponent', () => {
    const graph = BuilderGraph.parse({
      version: '1.0',
      metadata: {
        sources: [{ repository: 'example/repository' }],
        domains: { orders: { description: 'Orders', systemType: 'domain' } },
        customTypes: {},
        relationshipTypes: {},
      },
      components: [
        {
          id: 'orders:checkout:ui:page',
          type: 'UseCase',
          name: 'Page',
          domain: 'orders',
          module: 'checkout',
          sourceLocation: { repository: 'example/repository', filePath: 'checkout.ts' },
        },
      ],
      links: [],
      externalLinks: [],
    })

    expect(graph.hasComponent('orders:checkout:ui:page')).toBe(true)
    expect(graph.hasComponent('nonexistent')).toBe(false)
    expect(graph.getComponent('orders:checkout:ui:page')?.name).toBe('Page')
    expect(graph.getComponentIndex('orders:checkout:ui:page')).toBe(0)
  })

  it('O(1) link lookup via hasLink', () => {
    const graph = BuilderGraph.parse({
      version: '1.0',
      metadata: {
        sources: [{ repository: 'example/repository' }],
        domains: { orders: { description: 'Orders', systemType: 'domain' } },
        customTypes: {},
        relationshipTypes: {},
      },
      components: [],
      links: [
        {
          id: 'link-1',
          source: 'a',
          target: 'b',
        },
      ],
      externalLinks: [],
    })

    expect(graph.hasLink('link-1')).toBe(true)
    expect(graph.hasLink('nonexistent')).toBe(false)
  })

  it('deduplicates external links by composite key', () => {
    const graph = BuilderGraph.parse({
      version: '1.0',
      metadata: {
        sources: [{ repository: 'example/repository' }],
        domains: { orders: { description: 'Orders', systemType: 'domain' } },
        customTypes: {},
        relationshipTypes: {},
      },
      components: [],
      links: [],
      externalLinks: [],
    })

    const link: ExternalLink = {
      source: 'comp-a',
      target: { repository: 'ext-repo', name: 'ext-service' },
      type: 'sync',
    }

    graph.withExternalLink(link)

    const found = graph.findExternalLink({
      source: 'comp-a',
      target: { repository: 'ext-repo', name: 'ext-service' },
      type: 'sync',
    })

    expect(found).toBe(link)
  })

  it('restores external links from initial definition', () => {
    const link: ExternalLink = {
      source: 'comp-a',
      target: { repository: 'ext-repo', name: 'ext-service' },
      type: 'sync',
    }

    const graph = BuilderGraph.parse({
      version: '1.0',
      metadata: {
        sources: [{ repository: 'example/repository' }],
        domains: { orders: { description: 'Orders', systemType: 'domain' } },
        customTypes: {},
        relationshipTypes: {},
      },
      components: [],
      links: [],
      externalLinks: [link],
    })

    expect(graph.externalLinks).toHaveLength(1)
    expect(graph.findExternalLink(link)).toBe(link)
  })

  it('getComponent returns undefined for nonexistent id', () => {
    const graph = BuilderGraph.parse({
      version: '1.0',
      metadata: {
        sources: [],
        domains: {},
        customTypes: {},
        relationshipTypes: {},
      },
      components: [],
      links: [],
      externalLinks: [],
    })

    expect(graph.getComponent('nonexistent')).toBeUndefined()
    expect(graph.getComponentIndex('nonexistent')).toBe(-1)
  })

  it('withComponentAt replaces at a valid index and inserts at an empty slot', () => {
    const graph = BuilderGraph.parse({
      version: '1.0',
      metadata: {
        sources: [],
        domains: {},
        customTypes: {},
        relationshipTypes: {},
      },
      components: [
        {
          id: 'a:b:c:d',
          type: 'UseCase',
          name: 'A',
          domain: 'a',
          module: 'b',
          sourceLocation: { repository: 'example/repository', filePath: 'a.ts' },
        },
      ],
      links: [],
      externalLinks: [],
    })

    graph.withComponentAt(0, {
      id: 'x:y:z:w',
      type: 'UseCase',
      name: 'X',
      domain: 'x',
      module: 'y',
      sourceLocation: { repository: 'example/repository', filePath: 'x.ts' },
    })

    expect(graph.hasComponent('a:b:c:d')).toBe(false)
    expect(graph.hasComponent('x:y:z:w')).toBe(true)
    expect(graph.getComponentIndex('x:y:z:w')).toBe(0)
  })

  it('withComponentAt inserts into an empty graph at index 0', () => {
    const graph = BuilderGraph.parse({
      version: '1.0',
      metadata: {
        sources: [],
        domains: {},
        customTypes: {},
        relationshipTypes: {},
      },
      components: [],
      links: [],
      externalLinks: [],
    })

    graph.withComponentAt(0, {
      id: 'p:q:r:s',
      type: 'UseCase',
      name: 'P',
      domain: 'p',
      module: 'q',
      sourceLocation: { repository: 'example/repository', filePath: 'p.ts' },
    })

    expect(graph.hasComponent('p:q:r:s')).toBe(true)
    expect(graph.getComponentIndex('p:q:r:s')).toBe(0)
  })

  it('handles links without id in parse', () => {
    const graph = BuilderGraph.parse({
      version: '1.0',
      metadata: {
        sources: [],
        domains: {},
        customTypes: {},
        relationshipTypes: {},
      },
      components: [],
      links: [{ source: 'a', target: 'b' }],
      externalLinks: [],
    })

    expect(graph.links).toHaveLength(1)
  })

  it('handles links without id via withLink', () => {
    const graph = BuilderGraph.parse({
      version: '1.0',
      metadata: {
        sources: [],
        domains: {},
        customTypes: {},
        relationshipTypes: {},
      },
      components: [],
      links: [],
      externalLinks: [],
    })

    graph.withLink({ source: 'a', target: 'b' })

    expect(graph.links).toHaveLength(1)
  })
})
