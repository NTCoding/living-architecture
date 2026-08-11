import type {
  RiviereGraph,
  Component,
  ExternalLink,
  Link,
} from '@living-architecture/riviere-schema'
import type { ComponentId, LinkId } from './identifiers'
import { parseComponentId } from './identifiers'
import { componentById, searchComponents } from './component-queries'
import { ComponentNotFoundError } from './errors'
import { createLinkKey } from './link-key'
import { ENTRY_POINT_TYPES } from './flow-constants'

/** @riviere-role value-object */
export type LinkType = 'sync' | 'async'

/** @riviere-role value-object */
export interface FlowStep {
  component: Component
  outgoingLinks: Link[]
  depth: number
  externalLinks: ExternalLink[]
}

/** @riviere-role value-object */
export interface Flow {
  entryPoint: Component
  steps: FlowStep[]
}

/** @riviere-role value-object */
export interface SearchWithFlowResult {
  matchingIds: ComponentId[]
  visibleIds: ComponentId[]
}

/** @riviere-role domain-service */
export function findEntryPoints(graph: RiviereGraph): Component[] {
  const targets = new Set(graph.links.map((link) => link.target))
  return graph.components.filter((c) => ENTRY_POINT_TYPES.has(c.type) && !targets.has(c.id))
}

/** @riviere-role domain-service */
export function traceFlowFrom(
  graph: RiviereGraph,
  startComponentId: ComponentId,
): {
  componentIds: ComponentId[]
  linkIds: LinkId[]
} {
  const component = componentById(graph, startComponentId)
  if (!component) {
    throw new ComponentNotFoundError(startComponentId)
  }

  const visited = new Set<ComponentId>()
  const visitedLinks = new Set<LinkId>()
  const queue: ComponentId[] = [startComponentId]

  while (queue.length > 0) {
    const currentId = queue.shift()
    if (currentId === undefined || visited.has(currentId)) continue
    visited.add(currentId)

    for (const link of graph.links) {
      const sourceId = parseComponentId(link.source)
      const targetId = parseComponentId(link.target)
      if (link.source === currentId && !visited.has(targetId)) {
        queue.push(targetId)
        visitedLinks.add(createLinkKey(link))
      }
      if (link.target === currentId && !visited.has(sourceId)) {
        queue.push(sourceId)
        visitedLinks.add(createLinkKey(link))
      }
    }
  }

  return {
    componentIds: Array.from(visited),
    linkIds: Array.from(visitedLinks),
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

      steps.push({
        component,
        outgoingLinks: edges,
        depth,
        externalLinks,
      })

      for (const edge of edges) {
        traverse(edge.target, depth + 1)
      }
    }

    traverse(entryPointId, 0)
    return steps
  }

  return findEntryPoints(graph).map((entryPoint) => ({
    entryPoint,
    steps: traceForward(entryPoint.id),
  }))
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

/** @riviere-role value-object */
export interface SearchWithFlowOptions {returnAllOnEmptyQuery: boolean}

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
      const allIds = graph.components.map((c) => parseComponentId(c.id))
      return {
        matchingIds: allIds,
        visibleIds: allIds,
      }
    }
    return {
      matchingIds: [],
      visibleIds: [],
    }
  }

  const matchingComponents = searchComponents(graph, query)
  if (matchingComponents.length === 0) {
    return {
      matchingIds: [],
      visibleIds: [],
    }
  }

  const matchingIds = matchingComponents.map((c) => parseComponentId(c.id))
  const visibleIds = new Set<ComponentId>()

  for (const component of matchingComponents) {
    const flow = traceFlowFrom(graph, parseComponentId(component.id))
    for (const id of flow.componentIds) {
      visibleIds.add(id)
    }
  }

  return {
    matchingIds,
    visibleIds: Array.from(visibleIds),
  }
}
