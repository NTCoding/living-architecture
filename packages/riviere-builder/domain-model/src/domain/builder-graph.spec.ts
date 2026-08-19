import { describe, expect, it } from 'vitest'
import type {
  Component,
  DomainMetadata,
  ExternalLink,
  Link,
} from '@living-architecture/riviere-schema-published-language/schema'
import { BuilderGraph } from './builder-graph'

function emptyGraph(overrides?: {
  sources?: Array<{ repository: string }>
  domains?: Record<string, DomainMetadata>
  components?: Component[]
  links?: Link[]
  externalLinks?: ExternalLink[]
}) {
  return BuilderGraph.parse({
    version: '1.0',
    metadata: {
      sources: overrides?.sources ?? [],
      domains: overrides?.domains ?? {},
      customTypes: {},
      relationshipTypes: {},
    },
    components: overrides?.components ?? [],
    links: overrides?.links ?? [],
    externalLinks: overrides?.externalLinks ?? [],
  })
}

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
    const graph = emptyGraph({
      sources: [{ repository: 'example/repository' }],
      domains: {
        orders: {
          description: 'Orders',
          systemType: 'domain',
        },
      },
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
    const graph = emptyGraph({
      sources: [{ repository: 'example/repository' }],
      domains: { orders: { description: 'Orders', systemType: 'domain' } },
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
    })

    expect(graph.hasComponent('orders:checkout:ui:page')).toBe(true)
    expect(graph.hasComponent('nonexistent')).toBe(false)
    expect(graph.getComponent('orders:checkout:ui:page')?.name).toBe('Page')
    expect(graph.getComponentIndex('orders:checkout:ui:page')).toBe(0)
  })

  it('O(1) link lookup via hasLink', () => {
    const graph = emptyGraph({
      sources: [{ repository: 'example/repository' }],
      domains: { orders: { description: 'Orders', systemType: 'domain' } },
      links: [
        {
          id: 'link-1',
          source: 'a',
          target: 'b',
        },
      ],
    })

    expect(graph.hasLink('link-1')).toBe(true)
    expect(graph.hasLink('nonexistent')).toBe(false)
  })

  it('deduplicates external links by composite key', () => {
    const graph = emptyGraph({
      sources: [{ repository: 'example/repository' }],
      domains: { orders: { description: 'Orders', systemType: 'domain' } },
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

    const duplicate: ExternalLink = {
      source: 'comp-a',
      target: { repository: 'ext-repo', name: 'ext-service' },
      type: 'sync',
    }

    graph.withExternalLink(duplicate)

    expect(graph.findExternalLink(link)).toBe(duplicate)
  })

  it('restores external links from initial definition', () => {
    const link: ExternalLink = {
      source: 'comp-a',
      target: { repository: 'ext-repo', name: 'ext-service' },
      type: 'sync',
    }

    const graph = emptyGraph({
      sources: [{ repository: 'example/repository' }],
      domains: { orders: { description: 'Orders', systemType: 'domain' } },
      externalLinks: [link],
    })

    expect(graph.externalLinks).toHaveLength(1)
    expect(graph.findExternalLink(link)).toBe(link)
  })

  it('distinguishes external links that differ only in which field contains a separator character', () => {
    const graph = emptyGraph()

    const linkA: ExternalLink = {
      source: 'a|b',
      target: { name: 'c' },
    }
    const linkB: ExternalLink = {
      source: 'a',
      target: { name: 'b|c' },
    }

    graph.withExternalLink(linkA)
    graph.withExternalLink(linkB)

    expect(graph.findExternalLink(linkA)).toBe(linkA)
    expect(graph.findExternalLink(linkB)).toBe(linkB)
    expect(graph.externalLinks).toHaveLength(2)
  })

  it('getComponent returns undefined for nonexistent id', () => {
    const graph = emptyGraph()

    expect(graph.getComponent('nonexistent')).toBeUndefined()
    expect(graph.getComponentIndex('nonexistent')).toBe(-1)
  })

  it('withComponentAt replaces at a valid index and inserts at an empty slot', () => {
    const graph = emptyGraph({
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
    const graph = emptyGraph()

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
    const graph = emptyGraph({ links: [{ source: 'a', target: 'b' }] })

    expect(graph.links).toHaveLength(1)
  })

  it('withDomain stores __proto__ as its own key', () => {
    const graph = emptyGraph()

    graph.withDomain('__proto__', {
      description: 'Proto domain',
      systemType: 'domain',
    })

    expect(Object.hasOwn(graph.metadata.domains, '__proto__')).toBe(true)
    expect(graph.metadata.domains['__proto__']?.description).toBe('Proto domain')
  })

  it('withCustomType stores __proto__ as its own key', () => {
    const graph = emptyGraph()

    graph.withCustomType('__proto__', {
      description: '__proto__ custom type',
    })

    expect(Object.hasOwn(graph.metadata.customTypes, '__proto__')).toBe(true)
  })

  it('handles links without id via withLink', () => {
    const graph = emptyGraph()

    graph.withLink({ source: 'a', target: 'b' })

    expect(graph.links).toHaveLength(1)
  })

  it('withComponentAt throws for out-of-range index', () => {
    const graph = emptyGraph({
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
    })

    const badComponent = () => ({
      id: 'x:y:z:w',
      type: 'UseCase' as const,
      name: 'X',
      domain: 'x',
      module: 'y',
      sourceLocation: { repository: 'example/repository', filePath: 'x.ts' },
    })

    expect(() => graph.withComponentAt(-1, badComponent())).toThrow(RangeError)
    expect(() => graph.withComponentAt(5, badComponent())).toThrow(RangeError)
    expect(() => graph.withComponentAt(NaN, badComponent())).toThrow(RangeError)
    expect(() => graph.withComponentAt(1.5, badComponent())).toThrow(RangeError)
  })
})
