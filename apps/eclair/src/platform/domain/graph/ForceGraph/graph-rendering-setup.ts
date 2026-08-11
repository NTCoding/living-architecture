import * as d3 from 'd3'
import type { SimulationNode, SimulationLink } from '../graph-types'
import type { NodeType } from '@/platform/domain/eclair-types'
import type { Theme } from '@/platform/domain/theme/theme'
import { getLinkNodeId } from './FocusModeStyling'
import { LayoutError, RenderingError } from '@/platform/domain/errors/errors'
import * as relationshipPresentation from '@/platform/domain/relationship-presentation'
import * as linkLabelPositioning from './link-label-positioning'

export {
  getLinkNodeId,
  applyResetModeCircleStyles,
  applyResetModeLinkStyles,
  applyResetModeTextStyles,
} from './FocusModeStyling'

type SemanticEdgeType = 'event' | 'eventHandler' | 'external' | 'default'

export interface SetupLinksParams {
  linkGroup: d3.Selection<SVGGElement, unknown, d3.BaseType, unknown>
  links: SimulationLink[]
  theme: Theme
  nodeMap: Map<string, SimulationNode>
  getSemanticEdgeType: (sourceType: NodeType, targetType: NodeType) => SemanticEdgeType
  getSemanticEdgeColor: (sourceType: NodeType, targetType: NodeType, theme: Theme) => string
  isAsyncEdge: (type: string | undefined) => boolean
}

function getNodeType(nodeId: string, nodeMap: Map<string, SimulationNode>): NodeType {
  const node = nodeMap.get(nodeId)
  /* v8 ignore next -- @preserve defensive: link references only valid node IDs */
  if (!node) {
    throw new RenderingError(`Node ${nodeId} not found in node map`)
  }
  return node.type
}

export function setupLinks({
  linkGroup,
  links,
  theme,
  nodeMap,
  getSemanticEdgeType,
  getSemanticEdgeColor,
  isAsyncEdge: isAsync,
}: SetupLinksParams): d3.Selection<SVGPathElement, SimulationLink, SVGGElement, unknown> {
  return linkGroup
    .selectAll<SVGPathElement, SimulationLink>('path')
    .data(links)
    .join('path')
    .attr('class', (d) => {
      const sourceId = getLinkNodeId(d.source)
      const targetId = getLinkNodeId(d.target)
      const sourceType = getNodeType(sourceId, nodeMap)
      const targetType = getNodeType(targetId, nodeMap)
      const semanticType = getSemanticEdgeType(sourceType, targetType)
      const classes = ['graph-link', `edge-${semanticType}`]
      if (isAsync(d.type)) classes.push('async')
      return classes.join(' ')
    })
    .attr('stroke', (d) => {
      const sourceId = getLinkNodeId(d.source)
      const targetId = getLinkNodeId(d.target)
      const sourceType = getNodeType(sourceId, nodeMap)
      const targetType = getNodeType(targetId, nodeMap)
      return getSemanticEdgeColor(sourceType, targetType, theme)
    })
    .attr('stroke-width', 2)
    .attr('fill', 'none')
    .attr('opacity', 0.6)
    .attr('stroke-dasharray', (d) => (isAsync(d.type) ? '5,3' : 'none'))
    .attr('marker-end', (d) => {
      const sourceId = getLinkNodeId(d.source)
      const targetId = getLinkNodeId(d.target)
      const sourceType = getNodeType(sourceId, nodeMap)
      const targetType = getNodeType(targetId, nodeMap)
      const semanticType = getSemanticEdgeType(sourceType, targetType)
      return `url(#arrowhead-${semanticType})`
    })
}

export function setupLinkLabels(
  linkGroup: d3.Selection<SVGGElement, unknown, d3.BaseType, unknown>,
  links: SimulationLink[],
  mode: 'detailed' | 'semantic-only' = 'detailed',
): d3.Selection<SVGTextElement, SimulationLink, SVGGElement, unknown> {
  const labelLinks =
    mode === 'semantic-only'
      ? linkLabelPositioning.getUniqueRelationshipLabelLinks(links)
      : links.filter((link) => link.originalEdge.relationshipType !== undefined)
  const labels = linkGroup
    .selectAll<SVGTextElement, SimulationLink>('text')
    .data(labelLinks)
    .join('text')
    .attr('class', 'graph-link-label')
    .attr('text-anchor', 'middle')
    .attr('font-size', '10px')
    .attr('font-weight', mode === 'semantic-only' ? 500 : 600)
    .attr('fill', 'var(--text-secondary)')
    .attr('stroke', 'var(--surface-primary)')
    .attr('stroke-width', 3)
    .attr('paint-order', 'stroke')
    .text((link) =>
      mode === 'semantic-only'
        ? relationshipPresentation.relationshipLabel(link.originalEdge)
        : relationshipPresentation.relationshipDetail(link.originalEdge),
    )

  const verticalOffsets = linkLabelPositioning.getVerticalLabelOffsets(
    labels.data(),
    linkLabelPositioning.getUnorderedNodePairKey,
  )
  labels.attr('dy', (link) => verticalOffsets.get(link) ?? 0)

  if (mode === 'semantic-only') {
    const getDetails = (link: SimulationLink): string =>
      linkLabelPositioning.getRelationshipLabelDetails(links, link, (detailLink) =>
        relationshipPresentation.relationshipDetail(detailLink.originalEdge),
      )
    labels.attr('cursor', 'help').attr('aria-label', getDetails).append('title').text(getDetails)
  }

  return labels
}

export interface SetupNodesParams {
  nodeGroup: d3.Selection<SVGGElement, unknown, d3.BaseType, unknown>
  nodes: SimulationNode[]
  theme: Theme
  getNodeColor: (type: string, theme: Theme) => string
  getNodeRadius: (type: NodeType) => number
  getDomainColor: (domain: string, uniqueDomains: string[]) => string
  uniqueDomains: string[]
  truncateName: (name: string, maxLength: number) => string
}

export function setupNodes({
  nodeGroup,
  nodes,
  theme,
  getNodeColor,
  getNodeRadius,
  getDomainColor,
  uniqueDomains,
  truncateName: truncate,
}: SetupNodesParams): d3.Selection<SVGGElement, SimulationNode, SVGGElement, unknown> {
  const node = nodeGroup
    .selectAll<SVGGElement, SimulationNode>('g')
    .data(nodes)
    .join('g')
    .attr('class', 'graph-node')
    .attr('cursor', 'pointer')

  node
    .append('circle')
    .attr('class', 'node-circle')
    .attr('r', (d) => getNodeRadius(d.type))
    .attr('fill', (d) => getNodeColor(d.effectiveType ?? d.type, theme))
    .attr('stroke', 'rgba(255, 255, 255, 0.3)')
    .attr('stroke-width', 2)

  node
    .append('text')
    .attr('class', 'node-label')
    .attr('text-anchor', 'middle')
    .attr('dy', (d) => getNodeRadius(d.type) + 14)
    .attr('font-size', '11px')
    .attr('font-weight', 600)
    .attr('fill', 'var(--text-primary)')
    .text((d) => truncate(d.name, 30))

  node
    .append('text')
    .attr('class', 'node-domain-label')
    .attr('text-anchor', 'middle')
    .attr('dy', (d) => getNodeRadius(d.type) + 26)
    .attr('font-size', '9px')
    .attr('font-weight', 500)
    .attr('fill', (d) => getDomainColor(d.domain, uniqueDomains))
    .text((d) => d.domain)

  return node
}

export interface UpdatePositionsParams {
  link: d3.Selection<SVGPathElement, SimulationLink, SVGGElement, unknown>
  linkLabel?: d3.Selection<SVGTextElement, SimulationLink, SVGGElement, unknown>
  node: d3.Selection<SVGGElement, SimulationNode, SVGGElement, unknown>
  nodePositionMap: Map<string, SimulationNode>
  getNodeRadius: (type: NodeType) => number
}

export function createUpdatePositionsFunction(params: UpdatePositionsParams): () => void {
  const {
    link, linkLabel, node, nodePositionMap, getNodeRadius 
  } = params

  return function updatePositions(): void {
    link.attr('d', (d) => {
      const sourceId = getLinkNodeId(d.source)
      const targetId = getLinkNodeId(d.target)
      const sourceNode = nodePositionMap.get(sourceId)
      const targetNode = nodePositionMap.get(targetId)

      /* v8 ignore next 3 -- @preserve defensive: D3 callback, position map built from same nodes */
      if (!sourceNode) {
        throw new RenderingError(
          `Link source node '${sourceId}' not found in position map. Available nodes: [${[...nodePositionMap.keys()].join(', ')}]`,
        )
      }
      /* v8 ignore next 3 -- @preserve defensive: D3 callback, position map built from same nodes */
      if (!targetNode) {
        throw new RenderingError(
          `Link target node '${targetId}' not found in position map. Available nodes: [${[...nodePositionMap.keys()].join(', ')}]`,
        )
      }
      /* v8 ignore next 3 -- @preserve defensive: D3 callback, coordinates set by simulation */
      if (sourceNode.x === undefined || sourceNode.y === undefined) {
        throw new LayoutError(
          `Source node '${sourceId}' missing coordinates. Node: ${JSON.stringify(sourceNode)}`,
        )
      }
      /* v8 ignore next 3 -- @preserve defensive: D3 callback, coordinates set by simulation */
      if (targetNode.x === undefined || targetNode.y === undefined) {
        throw new LayoutError(
          `Target node '${targetId}' missing coordinates. Node: ${JSON.stringify(targetNode)}`,
        )
      }

      const sourceX = sourceNode.x
      const sourceY = sourceNode.y
      const targetX = targetNode.x
      const targetY = targetNode.y

      const dx = targetX - sourceX
      const dy = targetY - sourceY
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist === 0) return `M${sourceX},${sourceY}L${targetX},${targetY}`

      const sourceRadius = getNodeRadius(sourceNode.type) + 4
      const targetRadius = getNodeRadius(targetNode.type) + 12

      const startX = sourceX + (dx / dist) * sourceRadius
      const startY = sourceY + (dy / dist) * sourceRadius
      const endX = targetX - (dx / dist) * targetRadius
      const endY = targetY - (dy / dist) * targetRadius

      return `M${startX},${startY}L${endX},${endY}`
    })

    if (linkLabel !== undefined) {
      linkLabel.attr('x', (d) => {
        const source = nodePositionMap.get(getLinkNodeId(d.source))
        const target = nodePositionMap.get(getLinkNodeId(d.target))
        return ((source?.x ?? 0) + (target?.x ?? 0)) / 2
      })
      linkLabel.attr('y', (d) => {
        const source = nodePositionMap.get(getLinkNodeId(d.source))
        const target = nodePositionMap.get(getLinkNodeId(d.target))
        return ((source?.y ?? 0) + (target?.y ?? 0)) / 2 - 6
      })

      const verticalOffsets = linkLabelPositioning.getVerticalLabelOffsets(
        linkLabel.data(),
        (labelLink) => {
          const source = nodePositionMap.get(getLinkNodeId(labelLink.source))
          const target = nodePositionMap.get(getLinkNodeId(labelLink.target))
          return JSON.stringify([
            (source?.x ?? 0) + (target?.x ?? 0),
            (source?.y ?? 0) + (target?.y ?? 0),
          ])
        },
      )
      linkLabel.attr('dy', (labelLink) => verticalOffsets.get(labelLink) ?? 0)
    }

    node.attr('transform', (d) => {
      /* v8 ignore next 3 -- @preserve defensive: D3 callback, coordinates set by simulation */
      if (d.x === undefined || d.y === undefined) {
        throw new LayoutError(`Node ${d.id} missing layout coordinates after layout computation`)
      }
      return `translate(${d.x},${d.y})`
    })
  }
}
