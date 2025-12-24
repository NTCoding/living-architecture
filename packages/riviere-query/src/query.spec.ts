import type { RiviereGraph } from '@living-architecture/riviere-schema'
import { RiviereQuery } from './query.js'

function createMinimalValidGraph(): RiviereGraph {
  return {
    version: '1.0',
    metadata: {
      domains: {
        test: {
          description: 'Test domain',
          systemType: 'domain',
        },
      },
    },
    components: [
      {
        id: 'test:mod:ui:page',
        type: 'UI',
        name: 'Test Page',
        domain: 'test',
        module: 'mod',
        route: '/test',
        sourceLocation: {
          repository: 'test-repo',
          filePath: 'src/page.tsx',
        },
      },
    ],
    links: [],
  }
}

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
      graph.links = [{ source: 'a', target: 'b' }]
      const query = new RiviereQuery(graph)

      const links = query.links()

      expect(links).toHaveLength(1)
      expect(links[0]?.source).toBe('a')
    })
  })

  describe('validate()', () => {
    it('returns valid=true for a valid minimal graph', () => {
      const graph = createMinimalValidGraph()
      const query = new RiviereQuery(graph)

      const result = query.validate()

      expect(result.valid).toBe(true)
      expect(result.errors).toEqual([])
    })

    it('returns INVALID_LINK_SOURCE when link references non-existent source', () => {
      const graph = createMinimalValidGraph()
      graph.links = [
        {
          source: 'does-not-exist',
          target: 'test:mod:ui:page',
        },
      ]

      const query = new RiviereQuery(graph)
      const result = query.validate()

      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]?.code).toBe('INVALID_LINK_SOURCE')
      expect(result.errors[0]?.path).toBe('/links/0/source')
    })

    it('returns INVALID_LINK_TARGET when link references non-existent target', () => {
      const graph = createMinimalValidGraph()
      graph.links = [
        {
          source: 'test:mod:ui:page',
          target: 'does-not-exist',
        },
      ]

      const query = new RiviereQuery(graph)
      const result = query.validate()

      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]?.code).toBe('INVALID_LINK_TARGET')
      expect(result.errors[0]?.path).toBe('/links/0/target')
    })

    it('returns multiple errors when graph has multiple issues', () => {
      const graph = createMinimalValidGraph()
      graph.links = [
        { source: 'bad-source-1', target: 'bad-target-1' },
        { source: 'bad-source-2', target: 'test:mod:ui:page' },
      ]

      const query = new RiviereQuery(graph)
      const result = query.validate()

      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThanOrEqual(3)
    })

    it('returns INVALID_TYPE when Custom component references undefined custom type', () => {
      const graph = createMinimalValidGraph()
      graph.components.push({
        id: 'test:mod:custom:cronjob',
        type: 'Custom',
        customTypeName: 'CronJob',
        name: 'Update Tracking Cron',
        domain: 'test',
        module: 'mod',
        sourceLocation: { repository: 'test-repo', filePath: 'cron.ts' },
      })

      const query = new RiviereQuery(graph)
      const result = query.validate()

      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]?.code).toBe('INVALID_TYPE')
      expect(result.errors[0]?.path).toBe('/components/1/customTypeName')
      expect(result.errors[0]?.message).toContain('CronJob')
    })

    it('returns INVALID_TYPE when Custom component is missing required custom type property', () => {
      const graph = createMinimalValidGraph()
      graph.metadata.customTypes = {
        CronJob: {
          description: 'Scheduled background job',
          requiredProperties: {
            schedule: { type: 'string', description: 'Cron expression' },
          },
        },
      }
      graph.components.push({
        id: 'test:mod:custom:cronjob',
        type: 'Custom',
        customTypeName: 'CronJob',
        name: 'Update Tracking Cron',
        domain: 'test',
        module: 'mod',
        sourceLocation: { repository: 'test-repo', filePath: 'cron.ts' },
      })

      const query = new RiviereQuery(graph)
      const result = query.validate()

      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]?.code).toBe('INVALID_TYPE')
      expect(result.errors[0]?.path).toBe('/components/1')
      expect(result.errors[0]?.message).toContain('schedule')
    })

    it('returns valid when Custom component has all required custom type properties', () => {
      const graph = createMinimalValidGraph()
      graph.metadata.customTypes = {
        CronJob: {
          description: 'Scheduled background job',
          requiredProperties: {
            schedule: { type: 'string', description: 'Cron expression' },
          },
        },
      }
      graph.components.push({
        id: 'test:mod:custom:cronjob',
        type: 'Custom',
        customTypeName: 'CronJob',
        name: 'Update Tracking Cron',
        domain: 'test',
        module: 'mod',
        sourceLocation: { repository: 'test-repo', filePath: 'cron.ts' },
        metadata: {
          schedule: '0 * * * *',
        },
      })

      const query = new RiviereQuery(graph)
      const result = query.validate()

      expect(result.valid).toBe(true)
      expect(result.errors).toEqual([])
    })

    it('returns valid when Custom type has no requiredProperties', () => {
      const graph = createMinimalValidGraph()
      graph.metadata.customTypes = {
        SimpleJob: {
          description: 'A simple job with no required properties',
        },
      }
      graph.components.push({
        id: 'test:mod:custom:simplejob',
        type: 'Custom',
        customTypeName: 'SimpleJob',
        name: 'Simple Job',
        domain: 'test',
        module: 'mod',
        sourceLocation: { repository: 'test-repo', filePath: 'job.ts' },
      })

      const query = new RiviereQuery(graph)
      const result = query.validate()

      expect(result.valid).toBe(true)
      expect(result.errors).toEqual([])
    })
  })

  describe('detectOrphans()', () => {
    it('returns empty array when all components are connected', () => {
      const graph = createMinimalValidGraph()
      graph.components.push({
        id: 'test:mod:api:endpoint',
        type: 'API',
        name: 'Test API',
        domain: 'test',
        module: 'mod',
        apiType: 'REST',
        httpMethod: 'GET',
        path: '/api/test',
        sourceLocation: { repository: 'test-repo', filePath: 'api.ts' },
      })
      graph.links = [
        { source: 'test:mod:ui:page', target: 'test:mod:api:endpoint' },
      ]

      const query = new RiviereQuery(graph)
      const orphans = query.detectOrphans()

      expect(orphans).toEqual([])
    })

    it('returns orphan IDs when components have no links', () => {
      const graph = createMinimalValidGraph()

      const query = new RiviereQuery(graph)
      const orphans = query.detectOrphans()

      expect(orphans).toEqual(['test:mod:ui:page'])
    })

    it('considers both source and target links as connected', () => {
      const graph = createMinimalValidGraph()
      graph.components.push(
        {
          id: 'test:mod:api:a',
          type: 'API',
          name: 'API A',
          domain: 'test',
          module: 'mod',
          apiType: 'REST',
          httpMethod: 'GET',
          path: '/a',
          sourceLocation: { repository: 'test-repo', filePath: 'a.ts' },
        },
        {
          id: 'test:mod:api:b',
          type: 'API',
          name: 'API B',
          domain: 'test',
          module: 'mod',
          apiType: 'REST',
          httpMethod: 'GET',
          path: '/b',
          sourceLocation: { repository: 'test-repo', filePath: 'b.ts' },
        },
      )
      graph.links = [{ source: 'test:mod:api:a', target: 'test:mod:api:b' }]

      const query = new RiviereQuery(graph)
      const orphans = query.detectOrphans()

      expect(orphans).toEqual(['test:mod:ui:page'])
    })
  })
})
