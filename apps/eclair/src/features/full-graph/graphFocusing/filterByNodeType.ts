import type {
 Node, Edge, NodeType, NodeId 
} from '@/types/riviere'

export interface FilteredGraph {
  nodes: Node[]
  edges: Edge[]
}

function buildOutgoingEdgesMap(edges: Edge[]): Map<string, Edge[]> {
  const outgoingEdges = new Map<string, Edge[]>()
  for (const edge of edges) {
    const edgesFromSource = outgoingEdges.get(edge.source) ?? []
    edgesFromSource.push(edge)
    outgoingEdges.set(edge.source, edgesFromSource)
  }
  return outgoingEdges
}

function findVisibleDescendants(
  nodeId: string,
  visibleNodeIds: Set<string>,
  outgoingEdges: Map<string, Edge[]>,
  visited: Set<string>
): Array<{
 targetId: NodeId;
edge: Edge 
}> {
  if (visited.has(nodeId)) {
    return []
  }
  visited.add(nodeId)

  if (visibleNodeIds.has(nodeId)) {
    return []
  }

  const descendants: Array<{
 targetId: NodeId;
edge: Edge 
}> = []
  const nodeEdges = outgoingEdges.get(nodeId) ?? []

  for (const edge of nodeEdges) {
    if (visibleNodeIds.has(edge.target)) {
      descendants.push({
 targetId: edge.target,
edge 
})
      continue
    }

    const furtherDescendants = findVisibleDescendants(
      edge.target,
      visibleNodeIds,
      outgoingEdges,
      new Set(visited)
    )
    descendants.push(...furtherDescendants)
  }

  return descendants
}

function processEdgeForRewiring(
  edge: Edge,
  sourceVisible: boolean,
  targetVisible: boolean,
  visibleNodeIds: Set<string>,
  outgoingEdges: Map<string, Edge[]>,
  rewiredEdges: Edge[],
  addedEdgePairs: Set<string>
): void {
  if (sourceVisible && targetVisible) {
    rewiredEdges.push(edge)
    return
  }

  if (!sourceVisible || targetVisible) {
    return
  }

  const visibleTargets = findVisibleDescendants(
    edge.target,
    visibleNodeIds,
    outgoingEdges,
    new Set()
  )

  for (const {
 targetId, edge: originalEdge 
} of visibleTargets) {
    const edgeKey = `${edge.source}->${targetId}`
    if (addedEdgePairs.has(edgeKey)) {
      continue
    }

    const rewiredEdge: Edge = {
      source: edge.source,
      target: targetId,
    }
    if (originalEdge.type !== undefined) {
      rewiredEdge.type = originalEdge.type
    }
    if (originalEdge.type !== undefined) {
      rewiredEdge.type = originalEdge.type
    }
    rewiredEdges.push(rewiredEdge)
    addedEdgePairs.add(edgeKey)
  }
}

export function filterByNodeType(
  nodes: Node[],
  edges: Edge[],
  visibleTypes: Set<NodeType>
): FilteredGraph {
  const visibleNodes = nodes.filter((n) => visibleTypes.has(n.type))
  const visibleNodeIds = new Set(visibleNodes.map((n) => n.id))

  const outgoingEdges = buildOutgoingEdgesMap(edges)

  const rewiredEdges: Edge[] = []
  const addedEdgePairs = new Set<string>()

  for (const edge of edges) {
    const sourceVisible = visibleNodeIds.has(edge.source)
    const targetVisible = visibleNodeIds.has(edge.target)

    processEdgeForRewiring(
      edge,
      sourceVisible,
      targetVisible,
      visibleNodeIds,
      outgoingEdges,
      rewiredEdges,
      addedEdgePairs
    )
  }

  return {
 nodes: visibleNodes,
edges: rewiredEdges 
}
}
