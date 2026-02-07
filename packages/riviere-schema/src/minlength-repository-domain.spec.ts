import {
  parseRiviereGraph, RiviereSchemaValidationError 
} from './validation'

describe('minLength validation: metadata fields', () => {
  const baseGraph = {
    version: '1.0',
    metadata: {
      domains: {
        test: {
          description: 'Test domain',
          systemType: 'domain' as const,
        },
      },
    },
    components: [],
    links: [],
  }

  describe('metadata.sources[].repository', () => {
    it('rejects empty repository', () => {
      const input = {
        ...baseGraph,
        metadata: {
          ...baseGraph.metadata,
          sources: [{ repository: '' }],
        },
      }
      expect(() => parseRiviereGraph(input)).toThrow(RiviereSchemaValidationError)
      expect(() => parseRiviereGraph(input)).toThrow(/repository/)
    })

    it('rejects repository with length < 3', () => {
      const input = {
        ...baseGraph,
        metadata: {
          ...baseGraph.metadata,
          sources: [{ repository: 'ab' }],
        },
      }
      expect(() => parseRiviereGraph(input)).toThrow(RiviereSchemaValidationError)
      expect(() => parseRiviereGraph(input)).toThrow(/repository/)
    })

    it('accepts repository with length >= 3', () => {
      const input = {
        ...baseGraph,
        metadata: {
          ...baseGraph.metadata,
          sources: [{ repository: 'abc' }],
        },
      }
      expect(() => parseRiviereGraph(input)).not.toThrow()
    })
  })

  describe('sourceLocation.repository', () => {
    it('rejects empty repository', () => {
      const input = {
        ...baseGraph,
        components: [
          {
            id: 'test:mod:ui:page',
            type: 'UI',
            name: 'Page',
            domain: 'test',
            module: 'mod',
            route: '/test',
            sourceLocation: {
              repository: '',
              filePath: 'src/page.tsx',
            },
          },
        ],
      }
      expect(() => parseRiviereGraph(input)).toThrow(RiviereSchemaValidationError)
      expect(() => parseRiviereGraph(input)).toThrow(/repository/)
    })

    it('rejects repository with length < 3', () => {
      const input = {
        ...baseGraph,
        components: [
          {
            id: 'test:mod:ui:page',
            type: 'UI',
            name: 'Page',
            domain: 'test',
            module: 'mod',
            route: '/test',
            sourceLocation: {
              repository: 'ab',
              filePath: 'src/page.tsx',
            },
          },
        ],
      }
      expect(() => parseRiviereGraph(input)).toThrow(RiviereSchemaValidationError)
      expect(() => parseRiviereGraph(input)).toThrow(/repository/)
    })

    it('accepts repository with length >= 3', () => {
      const input = {
        ...baseGraph,
        components: [
          {
            id: 'test:mod:ui:page',
            type: 'UI',
            name: 'Page',
            domain: 'test',
            module: 'mod',
            route: '/test',
            sourceLocation: {
              repository: 'abc',
              filePath: 'src/page.tsx',
            },
          },
        ],
      }
      expect(() => parseRiviereGraph(input)).not.toThrow()
    })
  })

  describe('domainMetadata.description', () => {
    it('rejects empty description', () => {
      const input = {
        ...baseGraph,
        metadata: {
          domains: {
            test: {
              description: '',
              systemType: 'domain' as const,
            },
          },
        },
      }
      expect(() => parseRiviereGraph(input)).toThrow(RiviereSchemaValidationError)
      expect(() => parseRiviereGraph(input)).toThrow(/description/)
    })

    it('rejects description with length < 3', () => {
      const input = {
        ...baseGraph,
        metadata: {
          domains: {
            test: {
              description: 'ab',
              systemType: 'domain' as const,
            },
          },
        },
      }
      expect(() => parseRiviereGraph(input)).toThrow(RiviereSchemaValidationError)
      expect(() => parseRiviereGraph(input)).toThrow(/description/)
    })

    it('accepts description with length >= 3', () => {
      const input = {
        ...baseGraph,
        metadata: {
          domains: {
            test: {
              description: 'abc',
              systemType: 'domain' as const,
            },
          },
        },
      }
      expect(() => parseRiviereGraph(input)).not.toThrow()
    })
  })
})
