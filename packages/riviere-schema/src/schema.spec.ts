import type {
  RiviereGraph,
  Component,
  UIComponent,
  APIComponent,
  Link,
  GraphMetadata,
} from './published-language/schema'
import { parseRiviereGraph } from './published-language/validation'

function parseValidGraph(input: unknown): RiviereGraph {
  const result = parseRiviereGraph(input)
  expect(result.success).toBe(true)
  if (!result.success) {
    expect.fail(result.issues.join('\n'))
  }
  return result.graph
}

function expectInvalidGraph(input: unknown, expectedIssue: string): void {
  const result = parseRiviereGraph(input)
  expect(result.success).toBe(false)
  if (!result.success) {
    expect(result.issues.join('\n')).toContain(expectedIssue)
  }
}

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

    const result = parseValidGraph(input)

    expect(result.version).toBe('1.0')
    expect(result.components).toHaveLength(0)
  })

  it('parses a domain with the external-service system type', () => {
    const input = {
      version: '1.0',
      metadata: {
        domains: {
          alerts: {
            description: 'External alert service',
            systemType: 'external-service',
          },
        },
      },
      components: [],
      links: [],
    }

    const result = parseValidGraph(input)

    expect(result.metadata.domains['alerts']?.systemType).toBe('external-service')
  })

  it('parses relationship types and a Link source occurrence', () => {
    const input = {
      version: '1.0',
      metadata: {
        domains: {
          orders: {
            description: 'Orders',
            systemType: 'domain',
          },
        },
        relationshipTypes: { executes: { description: 'Invokes the target during execution' } },
      },
      components: [],
      links: [
        {
          id: 'component-a->component-b@src/a.ts:12:5',
          source: 'component-a',
          target: 'component-b',
          relationshipType: 'executes',
          condition: 'success',
          sourceLocation: {
            repository: 'test-repo',
            filePath: 'src/a.ts',
            lineNumber: 12,
            columnNumber: 5,
          },
        },
      ],
    }

    const result = parseValidGraph(input)

    expect(result.metadata.relationshipTypes?.['executes']?.description).toBe(
      'Invokes the target during execution',
    )
    expect(result.links[0]).toStrictEqual(input.links[0])
  })

  it('returns validation issues for an invalid component type', () => {
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

    expectInvalidGraph(input, '/components/0/type')
  })

  it('returns validation issues for a missing required field', () => {
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

    expectInvalidGraph(input, 'version')
  })

  it('returns validation issues for an invalid version format', () => {
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

    expectInvalidGraph(input, '/version')
  })

  it('parses external link target with optional route', () => {
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
      externalLinks: [
        {
          source: 'orders:useCase:PlaceOrder',
          target: {
            name: 'Fraud Detection Service',
            route: '/api/check',
          },
        },
      ],
    }

    const result = parseValidGraph(input)

    expect(result.externalLinks?.[0]?.target).toStrictEqual({
      name: 'Fraud Detection Service',
      route: '/api/check',
    })
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
      id: 'component-a->component-b@src/a.ts:12:5',
      source: 'component-a',
      target: 'component-b',
      type: 'sync',
      relationshipType: 'executes',
      condition: 'success',
      sourceLocation: {
        repository: 'test-repo',
        filePath: 'src/a.ts',
        lineNumber: 12,
        columnNumber: 5,
      },
    }

    expect(link).toStrictEqual({
      id: 'component-a->component-b@src/a.ts:12:5',
      source: 'component-a',
      target: 'component-b',
      type: 'sync',
      relationshipType: 'executes',
      condition: 'success',
      sourceLocation: {
        repository: 'test-repo',
        filePath: 'src/a.ts',
        lineNumber: 12,
        columnNumber: 5,
      },
    })
  })

  it('enforces metadata structure with required domains', () => {
    const metadata: GraphMetadata = {
      domains: {
        orders: {
          description: 'Order management',
          systemType: 'domain',
        },
      },
      relationshipTypes: { executes: { description: 'Invokes the target during execution' } },
    }

    expect(metadata.domains['orders']?.systemType).toBe('domain')
    expect(metadata.relationshipTypes?.['executes']?.description).toBe(
      'Invokes the target during execution',
    )
  })
})
