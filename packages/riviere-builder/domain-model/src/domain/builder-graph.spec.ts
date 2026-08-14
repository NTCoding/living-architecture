import { describe, expect, it } from 'vitest'
import { BuilderGraph } from './builder-graph'

describe('BuilderGraph', () => {
  it('returns a new graph without changing the original', () => {
    const original = BuilderGraph.parse({
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

    const updated = original.withDomain('shipping', {
      description: 'Shipping',
      systemType: 'domain',
    })

    expect(original.metadata.domains).not.toHaveProperty('shipping')
    expect(updated.metadata.domains['shipping']).toStrictEqual({
      description: 'Shipping',
      systemType: 'domain',
    })
    expect(updated.metadata.generated).toBe('2026-08-12T00:00:00.000Z')
    expect(updated).not.toBe(original)
  })

  it('chains updates into successive graph values', () => {
    const original = BuilderGraph.parse({
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

    const updated = original
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

    expect(updated.metadata.domains).toHaveProperty('shipping')
    expect(updated.components).toHaveLength(1)
    expect(original.components).toHaveLength(0)
  })
})
