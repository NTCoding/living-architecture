import type { RiviereGraph } from '@living-architecture/riviere-schema-published-language/schema'
import { RiviereBuilder } from './riviere-builder'
import { InvalidGraphError } from './construction-errors'

function parseGraph(builder: RiviereBuilder): RiviereGraph {
  const graph: RiviereGraph = JSON.parse(builder.serialize())
  return graph
}

function createValidOptions() {
  return {
    sources: [
      {
        repository: 'my-org/my-repo',
        commit: 'abc123',
      },
    ],
    domains: {
      orders: {
        description: 'Order management',
        systemType: 'domain',
      },
    },
  } as const
}

describe('RiviereBuilder', () => {
  describe('new', () => {
    it('returns builder instance when given valid options', () => {
      const options = {
        sources: [
          {
            repository: 'my-org/my-repo',
            commit: 'abc123',
          },
        ],
        domains: {
          orders: {
            description: 'Order management',
            systemType: 'domain',
          },
        },
      } as const

      const builder = RiviereBuilder.new(options)

      expect(builder).toBeInstanceOf(RiviereBuilder)
    })

    it('throws when sources array is empty', () => {
      const options = {
        sources: [],
        domains: {
          orders: {
            description: 'Order management',
            systemType: 'domain',
          },
        },
      } as const

      expect(() => RiviereBuilder.new(options)).toThrow('At least one source required')
    })

    it('throws when domains object is empty', () => {
      const options = {
        sources: [{ repository: 'my-org/my-repo' }],
        domains: {},
      } as const

      expect(() => RiviereBuilder.new(options)).toThrow('At least one domain required')
    })

    it('configures graph metadata from options', () => {
      const options = {
        name: 'my-service',
        description: 'Service description',
        sources: [
          {
            repository: 'my-org/my-repo',
            commit: 'abc123',
          },
        ],
        domains: {
          orders: {
            description: 'Order management',
            systemType: 'domain',
          },
        },
      } as const

      const builder = RiviereBuilder.new(options)

      expect(parseGraph(builder).metadata.name).toBe('my-service')
      expect(parseGraph(builder).metadata.description).toBe('Service description')
      expect(parseGraph(builder).metadata.sources).toStrictEqual([
        {
          repository: 'my-org/my-repo',
          commit: 'abc123',
        },
      ])
      expect(parseGraph(builder).metadata.domains).toStrictEqual({
        orders: {
          description: 'Order management',
          systemType: 'domain',
        },
      })
    })

    it('creates fresh empty construction state with the same graph definition', () => {
      const builder = RiviereBuilder.new({
        ...createValidOptions(),
        name: 'Shop',
        description: 'Shop graph',
      })
      builder.addUseCase({
        name: 'Place order',
        domain: 'orders',
        module: 'orders',
        sourceLocation: { repository: 'my-org/my-repo', filePath: 'orders.ts' },
      })

      expect(builder.fresh().build()).toStrictEqual({
        version: '1.0',
        metadata: expect.objectContaining({
          name: 'Shop',
          description: 'Shop graph',
          sources: createValidOptions().sources,
          domains: createValidOptions().domains,
        }),
        components: [],
        links: [],
      })
    })

    it('creates fresh state when optional graph metadata is absent', () => {
      const freshGraph = RiviereBuilder.new(createValidOptions()).fresh().build()

      expect(freshGraph.metadata).not.toHaveProperty('name')
      expect(freshGraph.metadata).not.toHaveProperty('description')
    })
  })

  describe('graphOptionsFrom', () => {
    it('returns graph construction options from persisted metadata', () => {
      const builder = RiviereBuilder.new({
        ...createValidOptions(),
        name: 'Shop',
        description: 'Shop graph',
      })

      expect(RiviereBuilder.graphOptionsFrom(builder.build())).toStrictEqual({
        name: 'Shop',
        description: 'Shop graph',
        sources: createValidOptions().sources,
        domains: createValidOptions().domains,
      })
    })

    it('omits absent optional graph metadata', () => {
      const graph = RiviereBuilder.new(createValidOptions()).build()

      expect(RiviereBuilder.graphOptionsFrom(graph)).toStrictEqual(createValidOptions())
    })

    it('rejects persisted metadata without sources', () => {
      const graph = {
        version: '1.0',
        metadata: { domains: createValidOptions().domains },
        components: [],
        links: [],
      }

      expect(() => RiviereBuilder.graphOptionsFrom(graph)).toThrowError(InvalidGraphError)
      expect(() => RiviereBuilder.graphOptionsFrom(graph)).toThrowError(
        'Invalid graph: missing sources',
      )
    })
  })

  describe('addSource', () => {
    it('appends source to metadata sources', () => {
      const builder = RiviereBuilder.new(createValidOptions())

      builder.addSource({
        repository: 'another-org/another-repo',
        commit: 'def456',
      })

      expect(parseGraph(builder).metadata.sources).toStrictEqual([
        {
          repository: 'my-org/my-repo',
          commit: 'abc123',
        },
        {
          repository: 'another-org/another-repo',
          commit: 'def456',
        },
      ])
    })

    it('allows adding source without commit', () => {
      const builder = RiviereBuilder.new(createValidOptions())

      builder.addSource({ repository: 'no-commit-repo' })

      expect(parseGraph(builder).metadata.sources).toContainEqual({ repository: 'no-commit-repo' })
    })

    it('is idempotent when adding an identical source', () => {
      const builder = RiviereBuilder.new(createValidOptions())

      builder.addSource({
        repository: 'my-org/my-repo',
        commit: 'abc123',
      })

      expect(parseGraph(builder).metadata.sources).toHaveLength(1)
    })

    it('throws when same repository has different source metadata', () => {
      const builder = RiviereBuilder.new(createValidOptions())

      expect(() =>
        builder.addSource({
          repository: 'my-org/my-repo',
          commit: 'different-sha',
        }),
      ).toThrow("Source 'my-org/my-repo' already exists with different values")
    })
  })

  describe('addDomain', () => {
    it('adds domain to metadata domains', () => {
      const builder = RiviereBuilder.new(createValidOptions())

      builder.addDomain({
        name: 'shipping',
        description: 'Shipping operations',
        systemType: 'domain',
      })

      expect(parseGraph(builder).metadata.domains['shipping']).toStrictEqual({
        description: 'Shipping operations',
        systemType: 'domain',
      })
    })

    it('is idempotent when domain name already exists with identical metadata', () => {
      const builder = RiviereBuilder.new(createValidOptions())

      builder.addDomain({
        name: 'orders',
        description: 'Order management',
        systemType: 'domain',
      })

      expect(parseGraph(builder).metadata.domains['orders']).toStrictEqual({
        description: 'Order management',
        systemType: 'domain',
      })
    })

    it('throws when domain name already exists with different metadata', () => {
      const builder = RiviereBuilder.new(createValidOptions())

      expect(() =>
        builder.addDomain({
          name: 'orders',
          description: 'Duplicate',
          systemType: 'domain',
        }),
      ).toThrow("Domain 'orders' already exists")
    })
  })
})
