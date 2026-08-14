import type {
  Component,
  ExternalLink,
  Link,
  RiviereGraph,
} from '@living-architecture/riviere-schema-published-language/schema'
import { ComponentId } from './component-id'
import { componentById, searchComponents } from './component-queries'
import { ComponentNotFoundError } from './errors'
import { Flow } from './flow'
import { isEntryPointType } from './flow-constants'
import { FlowStep } from './flow-step'
import { LinkId } from './link-id'
import { createLinkKey } from './link-key'
import { SearchWithFlowOptions } from './search-with-flow-options'
import { SearchWithFlowResult } from './search-with-flow-result'

/** @riviere-role domain-service */
export function findEntryPoints(graph: RiviereGraph): Component[] {
  const targets = new Set(graph.links.map((link) => link.target))
  return graph.components.filter((c) => isEntryPointType(c.type) && !targets.has(c.id))
}

/** @riviere-role domain-service */
export function traceFlowFrom(
  graph: RiviereGraph,
  startComponentId: ComponentId,
): {
  componentIds: ComponentId[]
  linkIds: LinkId[]
} {
  const component = componentById(graph, startComponentId.value)
  if (!component) {
    throw new ComponentNotFoundError(startComponentId.value)
  }

  const visited = new Set<string>()
  const visitedLinks = new Set<string>()
  const queue: string[] = [startComponentId.value]

  while (queue.length > 0) {
    const currentId = queue.shift()
    if (currentId === undefined || visited.has(currentId)) continue
    visited.add(currentId)

    for (const link of graph.links) {
      if (link.source === currentId && !visited.has(link.target)) {
        queue.push(link.target)
        visitedLinks.add(createLinkKey(link).value)
      }
      if (link.target === currentId && !visited.has(link.source)) {
        queue.push(link.source)
        visitedLinks.add(createLinkKey(link).value)
      }
    }
  }

  return {
    componentIds: Array.from(visited, ComponentId.parse),
    linkIds: Array.from(visitedLinks, LinkId.parse),
  }
}

/** @riviere-role domain-service */
export function queryFlows(graph: RiviereGraph): Flow[] {
  const componentByIdMap = new Map(graph.components.map((c) => [c.id, c]))
  const outgoingEdges = buildOutgoingEdges(graph)
  const externalLinksBySource = buildExternalLinksBySource(graph)

  const traceForward = (entryPointId: string): Flow['steps'] => {
    const steps: Flow['steps'] = []
    const visited = new Set<string>()

    const traverse = (nodeId: string, depth: number): void => {
      if (visited.has(nodeId)) return
      visited.add(nodeId)

      const component = componentByIdMap.get(nodeId)
      if (!component) return

      const edges = outgoingEdges.get(nodeId) ?? []
      const externalLinks = externalLinksBySource.get(nodeId) ?? []

      steps.push(
        FlowStep.parse({
          component,
          outgoingLinks: edges,
          depth,
          externalLinks,
        }),
      )

      for (const edge of edges) {
        traverse(edge.target, depth + 1)
      }
    }

    traverse(entryPointId, 0)
    return steps
  }

  return findEntryPoints(graph).map((entryPoint) =>
    Flow.parse({
      entryPoint,
      steps: traceForward(entryPoint.id),
    }),
  )
}

function buildExternalLinksBySource(graph: RiviereGraph): Map<string, ExternalLink[]> {
  const externalLinks = graph.externalLinks ?? []
  const bySource = new Map<string, ExternalLink[]>()

  for (const link of externalLinks) {
    const existing = bySource.get(link.source)
    if (existing) {
      existing.push(link)
    } else {
      bySource.set(link.source, [link])
    }
  }

  return bySource
}

function buildOutgoingEdges(graph: RiviereGraph): Map<string, Link[]> {
  const edges = new Map<string, Link[]>()
  for (const link of graph.links) {
    const existing = edges.get(link.source)
    if (existing) {
      existing.push(link)
    } else {
      edges.set(link.source, [link])
    }
  }
  return edges
}

/** @riviere-role domain-service */
export function searchWithFlowContext(
  graph: RiviereGraph,
  query: string,
  options: SearchWithFlowOptions,
): SearchWithFlowResult {
  const trimmedQuery = query.trim().toLowerCase()
  const isEmptyQuery = trimmedQuery === ''

  if (isEmptyQuery) {
    if (options.returnAllOnEmptyQuery) {
      const allIds = graph.components.map((c) => ComponentId.parse(c.id))
      return SearchWithFlowResult.parse({
        matchingIds: allIds,
        visibleIds: allIds,
      })
    }
    return SearchWithFlowResult.parse({
      matchingIds: [],
      visibleIds: [],
    })
  }

  const matchingComponents = searchComponents(graph, query)
  if (matchingComponents.length === 0) {
    return SearchWithFlowResult.parse({
      matchingIds: [],
      visibleIds: [],
    })
  }

  const matchingIds = matchingComponents.map((c) => ComponentId.parse(c.id))
  const visibleIds = new Set<ComponentId>()

  for (const component of matchingComponents) {
    const flow = traceFlowFrom(graph, ComponentId.parse(component.id))
    for (const id of flow.componentIds) {
      visibleIds.add(id)
    }
  }

  return SearchWithFlowResult.parse({
    matchingIds,
    visibleIds: Array.from(visibleIds),
  })
}
