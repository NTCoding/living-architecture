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

  it('hasComponent is O(1)', () => {
    const t0 = performance.now()
    componentIds.forEach((id) => graph.hasComponent(id))
    const ms = performance.now() - t0
    console.log(`hasComponent x${COMPONENT_COUNT}: ${ms.toFixed(1)}ms`)
    expect(ms).toBeLessThan(200)
  })

  it('getComponent is fast', () => {
    const t0 = performance.now()
    componentIds.forEach((id) => graph.getComponent(id))
    const ms = performance.now() - t0
    console.log(`getComponent x${COMPONENT_COUNT}: ${ms.toFixed(1)}ms`)
    expect(ms).toBeLessThan(2000)
  })

  it('getComponentIndex is fast', () => {
    const t0 = performance.now()
    componentIds.forEach((id) => graph.getComponentIndex(id))
    const ms = performance.now() - t0
    console.log(`getComponentIndex x${COMPONENT_COUNT}: ${ms.toFixed(1)}ms`)
    expect(ms).toBeLessThan(2000)
  })

  it('hasLink is O(1)', () => {
    const t0 = performance.now()
    linkIds.forEach((id) => graph.hasLink(id))
    const ms = performance.now() - t0
    console.log(`hasLink x${LINK_COUNT}: ${ms.toFixed(1)}ms`)
    expect(ms).toBeLessThan(200)
  })

  it('components getter is O(1) cached', () => {
    const t0 = performance.now()
    expect(graph.components).toHaveLength(COMPONENT_COUNT)
    const ms = performance.now() - t0
    console.log(`components getter: ${ms.toFixed(1)}ms`)
    expect(ms).toBeLessThan(50)
  })

  it('links getter is O(1) cached', () => {
    const t0 = performance.now()
    expect(graph.links).toHaveLength(LINK_COUNT)
    const ms = performance.now() - t0
    console.log(`links getter: ${ms.toFixed(1)}ms`)
    expect(ms).toBeLessThan(50)
  })
})
