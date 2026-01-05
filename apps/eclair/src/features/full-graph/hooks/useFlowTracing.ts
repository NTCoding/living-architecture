import type { Edge } from '@/types/riviere'

export interface FlowResult {
  nodeIds: Set<string>
  edgeKeys: Set<string>
}

function createEdgeKey(source: string, target: string): string {
  return `${source}->${target}`
}

export function traceFlow(startNodeId: string, edges: Edge[]): FlowResult {
  const nodeIds = new Set<string>([startNodeId])
  const edgeKeys = new Set<string>()
  const visitedForward = new Set<string>()
  const visitedBackward = new Set<string>()

  function traverseForward(nodeId: string): void {
    if (visitedForward.has(nodeId)) return
    visitedForward.add(nodeId)

    for (const edge of edges) {
      if (edge.source === nodeId) {
        nodeIds.add(edge.target)
        edgeKeys.add(createEdgeKey(edge.source, edge.target))
        traverseForward(edge.target)
      }
    }
  }

  function traverseBackward(nodeId: string): void {
    if (visitedBackward.has(nodeId)) return
    visitedBackward.add(nodeId)

    for (const edge of edges) {
      if (edge.target === nodeId) {
        nodeIds.add(edge.source)
        edgeKeys.add(createEdgeKey(edge.source, edge.target))
        traverseBackward(edge.source)
        traverseForward(edge.source)
      }
    }
  }

  traverseForward(startNodeId)
  traverseBackward(startNodeId)

  return {
    nodeIds,
    edgeKeys 
  }
}
