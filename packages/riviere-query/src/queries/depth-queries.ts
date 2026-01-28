import type { RiviereGraph } from '@living-architecture/riviere-schema'
import type { ComponentId } from './domain-types'
import { parseComponentId } from './domain-types'
import { ENTRY_POINT_TYPES } from './flow-constants'

interface DepthQueueEntry {
  id: ComponentId
  depth: number
}

export function queryNodeDepths(graph: RiviereGraph): Map<ComponentId, number> {
  const depths = new Map<ComponentId, number>()

  const entryPoints = findEntryPointIds(graph)
  if (entryPoints.length === 0) {
    return depths
  }

  const outgoingEdges = buildOutgoingEdges(graph)
  const queue: DepthQueueEntry[] = entryPoints.map((id) => ({
    id,
    depth: 0,
  }))

  processQueue(queue, depths, outgoingEdges)

  return depths
}

function processQueue(
  queue: DepthQueueEntry[],
  depths: Map<ComponentId, number>,
  outgoingEdges: Map<ComponentId, ComponentId[]>,
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
  outgoingEdges: Map<ComponentId, ComponentId[]>,
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

function findEntryPointIds(graph: RiviereGraph): ComponentId[] {
  const targets = new Set(graph.links.map((link) => link.target))
  return graph.components
    .filter((c) => ENTRY_POINT_TYPES.has(c.type) && !targets.has(c.id))
    .map((c) => parseComponentId(c.id))
}

function buildOutgoingEdges(graph: RiviereGraph): Map<ComponentId, ComponentId[]> {
  const edges = new Map<ComponentId, ComponentId[]>()
  for (const link of graph.links) {
    const sourceId = parseComponentId(link.source)
    const targetId = parseComponentId(link.target)
    const existing = edges.get(sourceId)
    if (existing) {
      existing.push(targetId)
    } else {
      edges.set(sourceId, [targetId])
    }
  }
  return edges
}
