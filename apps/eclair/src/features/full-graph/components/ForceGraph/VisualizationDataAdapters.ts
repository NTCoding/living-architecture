import type { Node, NodeType, Edge, ExternalLink } from '@/types/riviere'
import type { SimulationNode, SimulationLink } from '../../types'
import type { Theme } from '@/types/theme'
import { EDGE_COLORS, SEMANTIC_EDGE_COLORS, NODE_COLORS, NODE_RADII, getDomainColor } from '../../types'

interface ExternalNode {
  id: string
  type: 'External'
  name: string
  domain: string
  sourceLocation: { repository: string; filePath: string }
  url?: string
}

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

function createExternalNodeId(name: string): string {
  return `external:${name}`
}

function createExternalNodeFromLink(link: ExternalLink): ExternalNode {
  return {
    id: createExternalNodeId(link.target.name),
    type: 'External',
    name: link.target.name,
    domain: 'external',
    sourceLocation: { repository: 'external', filePath: '' },
    url: link.target.url,
  }
}

export function createExternalNodes(externalLinks: ExternalLink[] | undefined): SimulationNode[] {
  if (externalLinks === undefined) {
    return []
  }

  const seenNames = new Set<string>()
  const externalNodes: SimulationNode[] = []

  for (const link of externalLinks) {
    const name = link.target.name
    if (seenNames.has(name)) {
      continue
    }
    seenNames.add(name)

    const externalNode = createExternalNodeFromLink(link)
    externalNodes.push({
      id: externalNode.id,
      type: 'External',
      name: externalNode.name,
      domain: 'external',
      originalNode: externalNode,
    })
  }

  return externalNodes
}

export function createExternalLinks(externalLinks: ExternalLink[] | undefined): SimulationLink[] {
  if (externalLinks === undefined) {
    return []
  }

  return externalLinks.map((link) => {
    const targetId = createExternalNodeId(link.target.name)
    const syntheticEdge: Edge = {
      source: link.source,
      target: targetId,
      type: link.type,
    }

    return {
      source: link.source,
      target: targetId,
      type: link.type,
      originalEdge: syntheticEdge,
    }
  })
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

export type SemanticEdgeType = 'event' | 'eventHandler' | 'external' | 'default'

export function getSemanticEdgeType(sourceType: NodeType, targetType: NodeType): SemanticEdgeType {
  if (targetType === 'Event') return 'event'
  if (targetType === 'External') return 'external'
  if (sourceType === 'EventHandler') return 'eventHandler'
  return 'default'
}

export function getSemanticEdgeColor(sourceType: NodeType, targetType: NodeType, theme: Theme): string {
  const semanticType = getSemanticEdgeType(sourceType, targetType)
  return SEMANTIC_EDGE_COLORS[theme][semanticType]
}

export function truncateName(name: string, maxLength: number): string {
  if (name.length <= maxLength) return name
  return name.substring(0, maxLength - 2) + '...'
}

interface LayoutEdge {
  source: string
  target: string
}

export function createLayoutEdges(
  internalEdges: Edge[],
  externalLinks: ExternalLink[] | undefined
): LayoutEdge[] {
  const layoutEdges: LayoutEdge[] = internalEdges.map((e) => ({
    source: e.source,
    target: e.target,
  }))

  if (externalLinks !== undefined) {
    for (const link of externalLinks) {
      layoutEdges.push({
        source: link.source,
        target: createExternalNodeId(link.target.name),
      })
    }
  }

  return layoutEdges
}

export { getDomainColor }
