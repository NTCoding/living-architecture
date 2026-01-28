import * as d3 from 'd3'
import type {
  SimulationNode, SimulationLink 
} from '../../types'
import type { Edge } from '@/platform/domain/eclair-types'
import { traceFlow } from '../../hooks/useFlowTracing'
import { getLinkNodeId } from './FocusModeStyling'
import { LayoutError } from '@/shell/errors/errors'

export interface UpdateHighlightParams {
  node: d3.Selection<SVGGElement, SimulationNode, SVGGElement, unknown>
  link: d3.Selection<SVGPathElement, SimulationLink, SVGGElement, unknown>
  filteredEdges: Edge[]
  highlightedNodeIds: Set<string> | undefined
}

export function extractCoordinates(nodes: SimulationNode[], field: 'x' | 'y'): number[] {
  return nodes.map((n) => {
    const value = field === 'x' ? n.x : n.y
    if (value === undefined) {
      const coord = field === 'x' ? 'x' : 'y'
      throw new LayoutError(`Node ${n.id} missing layout ${coord} coordinate`)
    }
    return value
  })
}

export function updateHighlight({
  node,
  link,
  filteredEdges,
  highlightedNodeIds,
}: UpdateHighlightParams): void {
  if (!highlightedNodeIds || highlightedNodeIds.size === 0) {
    node.attr('opacity', 1)
    link.attr('opacity', 0.6)
    return
  }

  const firstHighlightedNodeId = Array.from(highlightedNodeIds)[0]
  if (firstHighlightedNodeId === undefined) return

  const highlightedFlow = traceFlow(firstHighlightedNodeId, filteredEdges)

  node.attr('opacity', (d) => (highlightedFlow.nodeIds.has(d.id) ? 1 : 0.2))

  link.attr('opacity', (d) => {
    const sourceId = getLinkNodeId(d.source)
    const targetId = getLinkNodeId(d.target)
    const edgeKey = `${sourceId}->${targetId}`
    return highlightedFlow.edgeKeys.has(edgeKey) ? 0.8 : 0.1
  })
}
