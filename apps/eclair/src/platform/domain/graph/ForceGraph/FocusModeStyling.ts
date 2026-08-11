import * as d3 from 'd3'
import type { NodeType } from '@/platform/domain/eclair-types'
import type { SimulationNode, SimulationLink } from '../graph-types'

export interface ResetModeCircleParams {
  node: d3.Selection<SVGGElement, SimulationNode, SVGGElement, unknown>
  transitionDuration: number
  getNodeRadius: (type: NodeType) => number
}

export function applyResetModeCircleStyles({
  node,
  transitionDuration,
  getNodeRadius,
}: ResetModeCircleParams): void {
  node
    .selectAll<SVGCircleElement, SimulationNode>('circle')
    .transition()
    .duration(transitionDuration)
    .attr('r', (d) => getNodeRadius(d.type))
    .attr('opacity', 1)
    .attr('stroke-width', 2)
    .attr('stroke', 'rgba(255, 255, 255, 0.3)')
    .attr('filter', 'none')
}

export function getLinkNodeId(nodeOrId: SimulationNode | string): string {
  return typeof nodeOrId === 'string' ? nodeOrId : nodeOrId.id
}

export interface ResetModeLinkParams {
  link: d3.Selection<SVGPathElement, SimulationLink, SVGGElement, unknown>
  transitionDuration: number
}

export function applyResetModeLinkStyles({
  link, transitionDuration 
}: ResetModeLinkParams): void {
  link
    .transition()
    .duration(transitionDuration)
    .attr('opacity', 0.6)
    .attr('stroke-width', 2)
    .attr('filter', 'none')
}

export interface ResetModeTextParams {
  node: d3.Selection<SVGGElement, SimulationNode, SVGGElement, unknown>
  transitionDuration: number
  selector: string
  opacity: number
  fontSize: string
  fontWeight: number
}

export function applyResetModeTextStyles({
  node,
  transitionDuration,
  selector,
  opacity,
  fontSize,
  fontWeight,
}: ResetModeTextParams): void {
  node
    .selectAll<SVGTextElement, SimulationNode>(selector)
    .transition()
    .duration(transitionDuration)
    .attr('opacity', opacity)
    .attr('font-size', fontSize)
    .attr('font-weight', fontWeight)
}
