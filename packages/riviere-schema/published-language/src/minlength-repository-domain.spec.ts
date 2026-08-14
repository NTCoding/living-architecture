import { parseRiviereGraph } from './published-language/validation'

function expectInvalid(input: unknown, fieldName: string): void {
  const result = parseRiviereGraph(input)
  expect(result.success).toBe(false)
  if (!result.success) {
    expect(result.issues.join('\n')).toContain(fieldName)
  }
}

function expectValid(input: unknown): void {
  expect(parseRiviereGraph(input).success).toBe(true)
}

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
      expectInvalid(input, 'repository')
    })

    it('rejects repository with length < 3', () => {
      const input = {
        ...baseGraph,
        metadata: {
          ...baseGraph.metadata,
          sources: [{ repository: 'ab' }],
        },
      }
      expectInvalid(input, 'repository')
    })

    it('accepts repository with length >= 3', () => {
      const input = {
        ...baseGraph,
        metadata: {
          ...baseGraph.metadata,
          sources: [{ repository: 'abc' }],
        },
      }
      expectValid(input)
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
      expectInvalid(input, 'repository')
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
      expectInvalid(input, 'repository')
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
      expectValid(input)
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
      expectInvalid(input, 'description')
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
      expectInvalid(input, 'description')
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
      expectValid(input)
    })
  })
})
