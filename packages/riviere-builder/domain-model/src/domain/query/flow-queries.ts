import type {
  Component,
  ExternalLink,
  Link,
  RiviereGraph,
} from '@living-architecture/riviere-schema-published-language/schema'
import { ComponentId } from './component-id'
import { Flow } from './flow'
import { isEntryPointType } from './flow-constants'
import { FlowStep } from './flow-step'
import { LinkId } from './link-id'
import { createLinkKey } from './link-key'

/**
 * @riviere-role domain-service
 * @riviere-role-justification TODO: Added before justification rule introduced.
 */
export function findEntryPoints(graph: RiviereGraph): Component[] {
  const targets = new Set(graph.links.map((link) => link.target))
  return graph.components.filter((c) => isEntryPointType(c.type) && !targets.has(c.id))
}

/**
 * @riviere-role domain-service
 * @riviere-role-justification TODO: Added before justification rule introduced.
 */
export function traceFlowFrom(
  graph: RiviereGraph,
  startComponent: Component,
): {
  componentIds: ComponentId[]
  linkIds: LinkId[]
} {
  const visited = new Set<string>()
  const visitedLinks = new Set<string>()
  const queue: string[] = [startComponent.id]

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

/**
 * @riviere-role domain-service
 * @riviere-role-justification TODO: Added before justification rule introduced.
 */
export function queryFlows(
  graph: RiviereGraph,
  entryPoints: readonly Component[],
): Flow[] {
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

  return entryPoints.map((entryPoint) =>
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
