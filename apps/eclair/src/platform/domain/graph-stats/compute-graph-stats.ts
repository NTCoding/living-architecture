import type { RiviereGraph } from '@living-architecture/riviere-schema'

export interface GraphStats {
  totalNodes: number
  totalDomains: number
  totalApis: number
  totalEntities: number
  totalEvents: number
  totalEdges: number
}

export function computeGraphStats(graph: RiviereGraph): GraphStats {
  const entities = new Set<string>()

  for (const node of graph.components) {
    if (node.type === 'DomainOp' && node.entity !== undefined) {
      entities.add(node.entity)
    }
  }

  return {
    totalNodes: graph.components.length,
    totalDomains: Object.keys(graph.metadata.domains).length,
    totalApis: graph.components.filter((n) => n.type === 'API').length,
    totalEntities: entities.size,
    totalEvents: graph.components.filter((n) => n.type === 'Event').length,
    totalEdges: graph.links.length,
  }
}
