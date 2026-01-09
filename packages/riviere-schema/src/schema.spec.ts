import type {
  RiviereGraph,
  Component,
  UIComponent,
  APIComponent,
  Link,
  GraphMetadata,
} from './schema'
import {
  parseRiviereGraph, formatValidationErrors 
} from './validation'

describe('formatValidationErrors()', () => {
  it('returns generic message when errors is null', () => {
    const result = formatValidationErrors(null)
    expect(result).toBe('validation failed without specific errors')
  })

  it('returns generic message when errors is empty array', () => {
    const result = formatValidationErrors([])
    expect(result).toBe('validation failed without specific errors')
  })

  it('formats single error with path and message', () => {
    const errors = [
      {
        instancePath: '/version',
        message: 'must match pattern',
      },
    ]
    const result = formatValidationErrors(errors)
    expect(result).toBe('/version: must match pattern')
  })

  it('formats multiple errors joined by newlines', () => {
    const errors = [
      {
        instancePath: '/version',
        message: 'must match pattern',
      },
      {
        instancePath: '/components/0/type',
        message: 'must be equal to one of the allowed values',
      },
    ]
    const result = formatValidationErrors(errors)
    expect(result).toBe(
      '/version: must match pattern\n/components/0/type: must be equal to one of the allowed values',
    )
  })
})

describe('parseRiviereGraph()', () => {
  it('parses valid graph and returns typed RiviereGraph', () => {
    const input = {
      version: '1.0',
      metadata: {
        domains: {
          test: {
            description: 'Test',
            systemType: 'domain',
          },
        },
      },
      components: [],
      links: [],
    }

    const result = parseRiviereGraph(input)

    expect(result.version).toBe('1.0')
    expect(result.components).toHaveLength(0)
  })

  it('throws on invalid component type', () => {
    const input = {
      version: '1.0',
      metadata: {
        domains: {
          test: {
            description: 'Test',
            systemType: 'domain',
          },
        },
      },
      components: [
        {
          id: 'x',
          type: 'InvalidType',
          name: 'X',
          domain: 'test',
          module: 'mod',
          sourceLocation: {
            repository: 'r',
            filePath: 'f',
          },
        },
      ],
      links: [],
    }

    expect(() => parseRiviereGraph(input)).toThrow(/Invalid RiviereGraph/)
  })

  it('throws on missing required field with error details', () => {
    const input = {
      metadata: {
        domains: {
          test: {
            description: 'Test',
            systemType: 'domain',
          },
        },
      },
      components: [],
      links: [],
    }

    expect(() => parseRiviereGraph(input)).toThrow(/version|Invalid RiviereGraph/i)
  })

  it('throws on invalid version format', () => {
    const input = {
      version: 'not-a-version',
      metadata: {
        domains: {
          test: {
            description: 'Test',
            systemType: 'domain',
          },
        },
      },
      components: [],
      links: [],
    }

    expect(() => parseRiviereGraph(input)).toThrow(/Invalid RiviereGraph/)
  })
})

describe('riviere-schema types', () => {
  it('compiles a minimal valid graph structure', () => {
    const graph: RiviereGraph = {
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

    expect(graph.version).toBe('1.0')
    expect(graph.components).toHaveLength(1)
  })

  it('enforces discriminated union for component types', () => {
    const uiComponent: UIComponent = {
      id: 'test:mod:ui:page',
      type: 'UI',
      name: 'Page',
      domain: 'test',
      module: 'mod',
      route: '/page',
      sourceLocation: {
        repository: 'repo',
        filePath: 'file.ts',
      },
    }

    const apiComponent: APIComponent = {
      id: 'test:mod:api:endpoint',
      type: 'API',
      name: 'Endpoint',
      domain: 'test',
      module: 'mod',
      apiType: 'REST',
      httpMethod: 'POST',
      path: '/api/test',
      sourceLocation: {
        repository: 'repo',
        filePath: 'api.ts',
      },
    }

    const components: Component[] = [uiComponent, apiComponent]
    expect(components).toHaveLength(2)
  })

  it('enforces link structure', () => {
    const link: Link = {
      source: 'component-a',
      target: 'component-b',
      type: 'sync',
    }

    expect(link.source).toBe('component-a')
    expect(link.target).toBe('component-b')
  })

  it('enforces metadata structure with required domains', () => {
    const metadata: GraphMetadata = {
      domains: {
        orders: {
          description: 'Order management',
          systemType: 'domain',
        },
      },
    }

    expect(metadata.domains['orders']?.systemType).toBe('domain')
  })
})
