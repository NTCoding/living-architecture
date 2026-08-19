import { describe, expect, it } from 'vitest'
import type {
  Component,
  ExternalLink,
  Link,
} from '@living-architecture/riviere-schema-published-language/schema'
import { BuilderGraph } from './builder-graph'

const COMPONENT_COUNT = 80_000
const LINK_COUNT = 80_000

function makeComponent(i: number): Component {
  return {
    id: `domain${i % 10}:module${i % 100}:Service:${i}`,
    type: 'UseCase',
    name: `Component ${i}`,
    domain: `domain${i % 10}`,
    module: `module${i % 100}`,
    sourceLocation: { repository: 'org/repo', filePath: `file-${i}.ts` },
  }
}

function makeLink(i: number): Link {
  return {
    id: `link-${i}`,
    source: `domain${i % 10}:module${i % 100}:Service:${i}`,
    target: `domain${(i + 1) % 10}:module${(i + 1) % 100}:Service:${(i + 1) % COMPONENT_COUNT}`,
  }
}

function makeExternalLink(i: number): ExternalLink {
  return {
    source: `domain${i % 10}:module${i % 100}:Service:${i}`,
    target: { repository: `org/repo-${i % 50}`, name: `service-${i % 50}` },
    type: 'sync',
  }
}

function buildLargeGraph(): BuilderGraph {
  const components = Array.from({ length: COMPONENT_COUNT }, (_, i) => makeComponent(i))
  const links = Array.from({ length: LINK_COUNT }, (_, i) => makeLink(i))
  const externalLinks = Array.from({ length: 1000 }, (_, i) => makeExternalLink(i))

  return BuilderGraph.parse({
    version: '1.0',
    metadata: {
      sources: [{ repository: 'org/repo' }],
      domains: Object.fromEntries(
        Array.from({ length: 10 }, (_, i) => [
          `domain${i}`,
          { description: `Domain ${i}`, systemType: 'domain' },
        ]),
      ),
      customTypes: {},
      relationshipTypes: {},
    },
    components,
    links,
    externalLinks,
  })
}

const componentIds = Array.from(
  { length: COMPONENT_COUNT },
  (_, i) => `domain${i % 10}:module${i % 100}:Service:${i}`,
)
const linkIds = Array.from({ length: LINK_COUNT }, (_, i) => `link-${i}`)

describe('BuilderGraph performance (80k scale)', () => {
  const graph = buildLargeGraph()

  it('hasComponent returns correct results for all components', () => {
    componentIds.forEach((id) => expect(graph.hasComponent(id)).toBe(true))
    expect(graph.hasComponent('nonexistent:id')).toBe(false)
  })

  it('getComponent returns correct results for all components', () => {
    componentIds.forEach((id) => {
      const component = graph.getComponent(id)
      expect(component).toBeDefined()
      expect(component?.id).toBe(id)
    })
  })

  it('getComponentIndex returns correct indices', () => {
    componentIds.forEach((id, i) => {
      expect(graph.getComponentIndex(id)).toBe(i)
    })
  })

  it('hasLink returns correct results for all links', () => {
    linkIds.forEach((id) => expect(graph.hasLink(id)).toBe(true))
    expect(graph.hasLink('nonexistent:id')).toBe(false)
  })

  it('components getter has correct length', () => {
    expect(graph.components).toHaveLength(COMPONENT_COUNT)
  })

  it('links getter has correct length', () => {
    expect(graph.links).toHaveLength(LINK_COUNT)
  })
})
