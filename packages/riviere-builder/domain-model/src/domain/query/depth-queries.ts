import type { RiviereGraph } from '@living-architecture/riviere-schema-published-language/schema'
import { ComponentDepths } from './component-depths'
import { isEntryPointType } from './flow-constants'

interface DepthQueueEntry {
  id: string
  depth: number
}

/** @riviere-role domain-service */
export function queryNodeDepths(graph: RiviereGraph): ComponentDepths {
  const depths = new Map<string, number>()

  const entryPoints = findEntryPointIds(graph)
  if (entryPoints.length === 0) {
    return ComponentDepths.parse(depths)
  }

  const outgoingEdges = buildOutgoingEdges(graph)
  const queue: DepthQueueEntry[] = entryPoints.map((id) => ({
    id,
    depth: 0,
  }))

  processQueue(queue, depths, outgoingEdges)

  return ComponentDepths.parse(depths)
}

function processQueue(
  queue: DepthQueueEntry[],
  depths: Map<string, number>,
  outgoingEdges: Map<string, string[]>,
): void {
  const current = queue.shift()
  if (current === undefined) return

  const existingDepth = depths.get(current.id)
  const shouldProcess = existingDepth === undefined || existingDepth > current.depth

  if (shouldProcess) {
    depths.set(current.id, current.depth)
    enqueueChildren(outgoingEdges, current, queue)
  }

  processQueue(queue, depths, outgoingEdges)
}

function enqueueChildren(
  outgoingEdges: Map<string, string[]>,
  current: DepthQueueEntry,
  queue: DepthQueueEntry[],
): void {
  const edges = outgoingEdges.get(current.id)
  if (edges) {
    for (const targetId of edges) {
      queue.push({
        id: targetId,
        depth: current.depth + 1,
      })
    }
  }
}

function findEntryPointIds(graph: RiviereGraph): string[] {
  const targets = new Set(graph.links.map((link) => link.target))
  return graph.components
    .filter((c) => isEntryPointType(c.type) && !targets.has(c.id))
    .map((c) => c.id)
}

function buildOutgoingEdges(graph: RiviereGraph): Map<string, string[]> {
  const edges = new Map<string, string[]>()
  for (const link of graph.links) {
    const existing = edges.get(link.source)
    if (existing) {
      existing.push(link.target)
    } else {
      edges.set(link.source, [link.target])
    }
  }
  return edges
}
