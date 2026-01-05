interface Edge {
  source: string
  target: string
}

function calculateSingleNodeDepth(nodeId: string, edges: Edge[], visited: Set<string>): number {
  if (visited.has(nodeId)) return 0
  visited.add(nodeId)

  const incomingEdges = edges.filter((e) => e.target === nodeId)
  if (incomingEdges.length === 0) return 0

  const depths = incomingEdges.map((e) =>
    calculateSingleNodeDepth(e.source, edges, new Set(visited)),
  )
  return Math.max(...depths, 0) + 1
}

export function calculateNodeDepths(nodeIds: string[], edges: Edge[]): Map<string, number> {
  const depths = new Map<string, number>()
  for (const id of nodeIds) {
    depths.set(id, calculateSingleNodeDepth(id, edges, new Set()))
  }
  return depths
}
