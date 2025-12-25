import type { Node, NodeType, Edge } from '@/types/riviere'
import type { SimulationNode, SimulationLink } from '../../types'
import type { Theme } from '@/types/theme'
import { EDGE_COLORS, NODE_COLORS, NODE_RADII, getDomainColor } from '../../types'

export function createSimulationNodes(nodes: Node[]): SimulationNode[] {
  return nodes.map((node) => ({
    id: node.id,
    type: node.type,
    name: node.name,
    domain: node.domain,
    originalNode: node,
  }))
}

export function createSimulationLinks(edges: Edge[]): SimulationLink[] {
  return edges.map((edge) => ({
    source: edge.source,
    target: edge.target,
    type: edge.type,
    originalEdge: edge,
  }))
}

export function getNodeColor(type: NodeType, theme: Theme): string {
  return NODE_COLORS[theme][type]
}

export function getNodeRadius(type: NodeType): number {
  return NODE_RADII[type]
}

export function getEdgeColor(type: string | undefined, theme: Theme): string {
  const colors = EDGE_COLORS[theme]
  if (type === 'async') {
    return colors.async
  }
  return colors.sync
}

export function isAsyncEdge(type: string | undefined): boolean {
  return type === 'async'
}

export function truncateName(name: string, maxLength: number): string {
  if (name.length <= maxLength) return name
  return name.substring(0, maxLength - 2) + '...'
}

export { getDomainColor }
