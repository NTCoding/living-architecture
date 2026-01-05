import {
  RiviereQuery, parseComponentId 
} from './RiviereQuery'
import {
  createMinimalValidGraph,
  createAPIComponent,
  createEventHandlerComponent,
  createCustomComponent,
  createUseCaseComponent,
} from './riviere-graph-fixtures'

describe('RiviereQuery', () => {
  describe('constructor', () => {
    it('accepts valid graph', () => {
      const graph = createMinimalValidGraph()

      const query = new RiviereQuery(graph)

      expect(query.components()).toHaveLength(1)
    })
  })

  describe('fromJSON', () => {
    it('throws on invalid graph schema', () => {
      const invalidGraph = { notAValidGraph: true }

      expect(() => RiviereQuery.fromJSON(invalidGraph)).toThrow()
    })

    it('returns RiviereQuery for valid graph', () => {
      const graph = createMinimalValidGraph()

      const query = RiviereQuery.fromJSON(graph)

      expect(query.components()).toHaveLength(1)
    })
  })

  describe('components()', () => {
    it('returns all components from the graph', () => {
      const graph = createMinimalValidGraph()
      const query = new RiviereQuery(graph)

      const components = query.components()

      expect(components).toHaveLength(1)
      expect(components[0]?.id).toBe('test:mod:ui:page')
    })
  })

  describe('links()', () => {
    it('returns all links from the graph', () => {
      const graph = createMinimalValidGraph()
      graph.links = [
        {
          source: 'a',
          target: 'b',
        },
      ]
      const query = new RiviereQuery(graph)

      const links = query.links()

      expect(links).toHaveLength(1)
      expect(links[0]?.source).toBe('a')
    })
  })

  describe('detectOrphans()', () => {
    it('returns empty array when all components are connected', () => {
      const graph = createMinimalValidGraph()
      graph.components.push(
        createAPIComponent({
          id: 'test:mod:api:endpoint',
          name: 'Test API',
          domain: 'test',
        }),
      )
      graph.links = [
        {
          source: 'test:mod:ui:page',
          target: 'test:mod:api:endpoint',
        },
      ]

      const query = new RiviereQuery(graph)

      expect(query.detectOrphans()).toEqual([])
    })

    it('returns orphan IDs when components have no links', () => {
      const graph = createMinimalValidGraph()
      const query = new RiviereQuery(graph)

      expect(query.detectOrphans()).toEqual(['test:mod:ui:page'])
    })

    it('considers both source and target links as connected', () => {
      const graph = createMinimalValidGraph()
      graph.components.push(
        createAPIComponent({
          id: 'test:mod:api:a',
          name: 'API A',
          domain: 'test',
        }),
        createAPIComponent({
          id: 'test:mod:api:b',
          name: 'API B',
          domain: 'test',
        }),
      )
      graph.links = [
        {
          source: 'test:mod:api:a',
          target: 'test:mod:api:b',
        },
      ]

      const query = new RiviereQuery(graph)

      expect(query.detectOrphans()).toEqual(['test:mod:ui:page'])
    })
  })

  describe('find()', () => {
    it('returns first matching component', () => {
      const graph = createMinimalValidGraph()
      graph.components.push(
        createAPIComponent({
          id: 'test:mod:api:endpoint',
          name: 'Test API',
          domain: 'test',
        }),
      )
      const query = new RiviereQuery(graph)

      expect(query.find((c) => c.type === 'API')?.id).toBe('test:mod:api:endpoint')
    })

    it('returns undefined when no component matches', () => {
      const graph = createMinimalValidGraph()
      const query = new RiviereQuery(graph)

      expect(query.find((c) => c.type === 'Event')).toBeUndefined()
    })
  })

  describe('findAll()', () => {
    it('returns all matching components', () => {
      const graph = createMinimalValidGraph()
      graph.metadata.domains['orders'] = {
        description: 'Orders',
        systemType: 'domain',
      }
      graph.components.push(
        createAPIComponent({
          id: 'orders:checkout:api:post',
          name: 'Create Order',
          domain: 'orders',
          httpMethod: 'POST',
        }),
        createAPIComponent({
          id: 'orders:fulfillment:api:get',
          name: 'Get Order',
          domain: 'orders',
        }),
      )
      const query = new RiviereQuery(graph)

      const result = query.findAll((c) => c.domain === 'orders')

      expect(result.map((c) => c.id)).toEqual([
        'orders:checkout:api:post',
        'orders:fulfillment:api:get',
      ])
    })

    it('returns empty array when no components match', () => {
      const query = new RiviereQuery(createMinimalValidGraph())

      expect(query.findAll((c) => c.domain === 'nonexistent')).toEqual([])
    })
  })

  describe('componentById()', () => {
    it('returns component when ID exists', () => {
      const query = new RiviereQuery(createMinimalValidGraph())

      const result = query.componentById(parseComponentId('test:mod:ui:page'))

      expect(result?.id).toBe('test:mod:ui:page')
    })

    it('returns undefined when ID does not exist', () => {
      const query = new RiviereQuery(createMinimalValidGraph())

      expect(query.componentById(parseComponentId('nonexistent:id'))).toBeUndefined()
    })
  })

  describe('search()', () => {
    it('returns components matching name case-insensitively', () => {
      const graph = createMinimalValidGraph()
      graph.metadata.domains['orders'] = {
        description: 'Orders',
        systemType: 'domain',
      }
      graph.components.push(
        createAPIComponent({
          id: 'orders:api:create',
          name: 'Create Order',
          domain: 'orders',
        }),
      )

      expect(new RiviereQuery(graph).search('ORDER')[0]?.id).toBe('orders:api:create')
    })

    it('returns components matching domain', () => {
      const graph = createMinimalValidGraph()
      graph.metadata.domains['shipping'] = {
        description: 'Shipping',
        systemType: 'domain',
      }
      graph.components.push(
        createAPIComponent({
          id: 'shipping:api:track',
          name: 'Track',
          domain: 'shipping',
        }),
      )

      expect(new RiviereQuery(graph).search('shipping')[0]?.id).toBe('shipping:api:track')
    })

    it('returns components matching type', () => {
      expect(new RiviereQuery(createMinimalValidGraph()).search('UI')[0]?.type).toBe('UI')
    })

    it('returns empty array for empty query string', () => {
      expect(new RiviereQuery(createMinimalValidGraph()).search('')).toEqual([])
    })

    it('returns empty array when no match found', () => {
      expect(new RiviereQuery(createMinimalValidGraph()).search('nonexistent')).toEqual([])
    })
  })

  describe('componentsInDomain()', () => {
    it('returns all components in specified domain', () => {
      const graph = createMinimalValidGraph()
      graph.metadata.domains['shipping'] = {
        description: 'Shipping',
        systemType: 'domain',
      }
      graph.components.push(
        createAPIComponent({
          id: 'shipping:api:a',
          name: 'A',
          domain: 'shipping',
        }),
        createAPIComponent({
          id: 'shipping:api:b',
          name: 'B',
          domain: 'shipping',
        }),
      )
      const query = new RiviereQuery(graph)

      const result = query.componentsInDomain('shipping')

      expect(result.map((c) => c.id)).toEqual(['shipping:api:a', 'shipping:api:b'])
    })

    it('returns empty array when domain has no components', () => {
      expect(new RiviereQuery(createMinimalValidGraph()).componentsInDomain('nonexistent')).toEqual(
        [],
      )
    })
  })

  describe('componentsByType()', () => {
    it('returns all components of specified type', () => {
      const graph = createMinimalValidGraph()
      graph.components.push(
        createAPIComponent({
          id: 'test:api:a',
          name: 'A',
          domain: 'test',
        }),
      )

      const result = new RiviereQuery(graph).componentsByType('API')

      expect(result.map((c) => c.id)).toEqual(['test:api:a'])
    })

    it('returns empty array when no components of type exist', () => {
      expect(new RiviereQuery(createMinimalValidGraph()).componentsByType('Event')).toEqual([])
    })
  })

  describe('externalLinks()', () => {
    it('returns empty array when graph has no external links', () => {
      expect(new RiviereQuery(createMinimalValidGraph()).externalLinks()).toEqual([])
    })

    it('returns external links from the graph', () => {
      const graph = createMinimalValidGraph()
      graph.externalLinks = [
        {
          source: 'test:mod:ui:page',
          target: { name: 'Stripe' },
          type: 'sync',
        },
        {
          source: 'test:mod:ui:page',
          target: { name: 'Twilio' },
          type: 'async',
        },
      ]
      const result = new RiviereQuery(graph).externalLinks()
      expect(result).toHaveLength(2)
      expect(result.map((l) => l.target.name)).toEqual(['Stripe', 'Twilio'])
    })
  })

  describe('entryPoints()', () => {
    it('includes UI component when it has no incoming links', () => {
      const graph = createMinimalValidGraph()
      const query = new RiviereQuery(graph)

      const result = query.entryPoints()

      expect(result.map((c) => c.id)).toEqual(['test:mod:ui:page'])
    })

    it('includes API component when it has no incoming links', () => {
      const graph = createMinimalValidGraph()
      graph.components = [
        createAPIComponent({
          id: 'test:api:create',
          name: 'Create',
          domain: 'test',
        }),
      ]
      const query = new RiviereQuery(graph)

      const result = query.entryPoints()

      expect(result.map((c) => c.id)).toEqual(['test:api:create'])
    })

    it('includes EventHandler component when it has no incoming links', () => {
      const graph = createMinimalValidGraph()
      graph.components = [
        createEventHandlerComponent({
          id: 'test:handler:order',
          name: 'Order Handler',
          domain: 'test',
        }),
      ]
      const query = new RiviereQuery(graph)

      const result = query.entryPoints()

      expect(result.map((c) => c.id)).toEqual(['test:handler:order'])
    })

    it('includes Custom component when it has no incoming links', () => {
      const graph = createMinimalValidGraph()
      graph.metadata.customTypes = { CronJob: { description: 'Scheduled job' } }
      graph.components = [
        createCustomComponent({
          id: 'test:cron:nightly',
          name: 'Nightly Sync',
          domain: 'test',
          customTypeName: 'CronJob',
        }),
      ]
      const query = new RiviereQuery(graph)

      const result = query.entryPoints()

      expect(result.map((c) => c.id)).toEqual(['test:cron:nightly'])
    })

    it('excludes API component when it has incoming link', () => {
      const graph = createMinimalValidGraph()
      graph.components.push(
        createAPIComponent({
          id: 'test:api:create',
          name: 'Create',
          domain: 'test',
        }),
      )
      graph.links = [
        {
          source: 'test:mod:ui:page',
          target: 'test:api:create',
        },
      ]
      const query = new RiviereQuery(graph)

      const result = query.entryPoints()

      expect(result.map((c) => c.id)).toEqual(['test:mod:ui:page'])
    })

    it('excludes UseCase component even when it has no incoming links', () => {
      const graph = createMinimalValidGraph()
      graph.components = [
        createUseCaseComponent({
          id: 'test:usecase:order',
          name: 'Create Order',
          domain: 'test',
        }),
      ]
      const query = new RiviereQuery(graph)

      const result = query.entryPoints()

      expect(result).toEqual([])
    })
  })

  describe('externalDomains()', () => {
    it('returns empty array when graph has no external links', () => {
      expect(new RiviereQuery(createMinimalValidGraph()).externalDomains()).toEqual([])
    })

    it('returns external domains with connection counts', () => {
      const graph = createMinimalValidGraph()
      graph.externalLinks = [
        {
          source: 'test:mod:ui:page',
          target: { name: 'Stripe' },
          type: 'sync',
        },
      ]
      const result = new RiviereQuery(graph).externalDomains()
      expect(result).toHaveLength(1)
      expect(result[0]?.name).toBe('Stripe')
      expect(result[0]?.connectionCount).toBe(1)
    })
  })
})
