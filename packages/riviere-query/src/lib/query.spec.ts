import type { RiviereGraph } from '@living-architecture/riviere-schema'
import type { ErrorObject } from 'ajv'
import { RiviereQuery, hasMessage, toValidationError } from './query.js'

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

    it('returns SCHEMA_ERROR when version is missing', () => {
      const graph = createMinimalValidGraph()
      // @ts-expect-error - intentionally invalid for test
      delete graph.version

      const query = new RiviereQuery(graph)
      const result = query.validate()

      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors[0]?.code).toBe('SCHEMA_ERROR')
    })

    it('returns SCHEMA_ERROR when components is not an array', () => {
      const graph = createMinimalValidGraph()
      // @ts-expect-error - intentionally invalid for test
      graph.components = 'not-an-array'

      const query = new RiviereQuery(graph)
      const result = query.validate()

      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.code === 'SCHEMA_ERROR')).toBe(true)
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
      // The single component has no links, so it's an orphan

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
      // a -> b, page is orphan
      graph.links = [{ source: 'test:mod:api:a', target: 'test:mod:api:b' }]

      const query = new RiviereQuery(graph)
      const orphans = query.detectOrphans()

      expect(orphans).toEqual(['test:mod:ui:page'])
    })
  })

  describe('hasMessage()', () => {
    it('returns true when error has message', () => {
      const error: ErrorObject = {
        keyword: 'required',
        instancePath: '/foo',
        schemaPath: '#/required',
        params: {},
        message: 'is required',
      }

      expect(hasMessage(error)).toBe(true)
    })

    it('returns false when error has no message', () => {
      const error: ErrorObject = {
        keyword: 'required',
        instancePath: '/foo',
        schemaPath: '#/required',
        params: {},
      }

      expect(hasMessage(error)).toBe(false)
    })
  })

  describe('toValidationError()', () => {
    it('converts ajv error to ValidationError', () => {
      const error: ErrorObject = {
        keyword: 'required',
        instancePath: '/components/0/name',
        schemaPath: '#/required',
        params: {},
        message: 'must have required property',
      }

      const result = toValidationError(error)

      expect(result.path).toBe('/components/0/name')
      expect(result.message).toBe('must have required property')
      expect(result.code).toBe('SCHEMA_ERROR')
    })

    it('uses root path when instancePath is empty', () => {
      const error: ErrorObject = {
        keyword: 'required',
        instancePath: '',
        schemaPath: '#/required',
        params: {},
        message: 'must have required property',
      }

      const result = toValidationError(error)

      expect(result.path).toBe('/')
    })

    it('throws when error has no message', () => {
      const error: ErrorObject = {
        keyword: 'required',
        instancePath: '/foo',
        schemaPath: '#/required',
        params: {},
      }

      expect(() => toValidationError(error)).toThrow('ajv error missing message')
    })
  })
})
