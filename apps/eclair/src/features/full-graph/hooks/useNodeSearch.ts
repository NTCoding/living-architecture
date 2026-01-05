import type {
  Node, Edge 
} from '@/types/riviere'
import { traceFlow } from './useFlowTracing'

export interface SearchResult {
  matchingNodeIds: Set<string>
  visibleNodeIds: Set<string>
}

function nodeMatchesQuery(node: Node, query: string): boolean {
  const lowerQuery = query.toLowerCase()
  return (
    node.name.toLowerCase().includes(lowerQuery) ||
    node.domain.toLowerCase().includes(lowerQuery) ||
    node.type.toLowerCase().includes(lowerQuery)
  )
}

export function filterNodesBySearch(
  query: string,
  nodes: Node[],
  edges: Edge[]
): SearchResult {
  const trimmedQuery = query.trim()

  if (trimmedQuery === '') {
    const allIds = new Set(nodes.map((n) => n.id))
    return {
      matchingNodeIds: allIds,
      visibleNodeIds: allIds,
    }
  }

  const matchingNodeIds = new Set<string>()
  for (const node of nodes) {
    if (nodeMatchesQuery(node, trimmedQuery)) {
      matchingNodeIds.add(node.id)
    }
  }

  if (matchingNodeIds.size === 0) {
    return {
      matchingNodeIds: new Set(),
      visibleNodeIds: new Set(),
    }
  }

  const visibleNodeIds = new Set<string>()
  for (const nodeId of matchingNodeIds) {
    const flow = traceFlow(nodeId, edges)
    for (const id of flow.nodeIds) {
      visibleNodeIds.add(id)
    }
  }

  return {
    matchingNodeIds,
    visibleNodeIds 
  }
}
