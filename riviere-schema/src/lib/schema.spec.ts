import type {
  RiviereGraph,
  Component,
  UIComponent,
  APIComponent,
  Link,
  GraphMetadata,
} from './schema.js'

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
      sourceLocation: { repository: 'repo', filePath: 'file.ts' },
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
      sourceLocation: { repository: 'repo', filePath: 'api.ts' },
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
