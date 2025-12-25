import * as d3 from 'd3'
import type { NodeType } from '@/types/riviere'
import type { SimulationNode, SimulationLink } from '../../types'

export interface FocusModeCircleParams {
  node: d3.Selection<SVGGElement, SimulationNode, SVGGElement, unknown>
  focusedDomain: string
  focusColors: { glowColor: string }
  transitionDuration: number
  nodeRadiusScale: { focusedRadius: number; unfocusedRadius: number }
  opacityValues: { focusedNode: number; unfocusedNode: number }
  strokeWidths: { focusedNodeWidth: number; unfocusedNodeWidth: number }
  getNodeRadius: (type: NodeType) => number
  unfocusedStrokeColor: string
}

export function applyFocusModeCircleStyles({
  node,
  focusedDomain,
  focusColors,
  transitionDuration,
  nodeRadiusScale,
  opacityValues,
  strokeWidths,
  getNodeRadius,
  unfocusedStrokeColor,
}: FocusModeCircleParams): void {
  node.selectAll<SVGCircleElement, SimulationNode>('circle')
    .transition()
    .duration(transitionDuration)
    .attr('r', (d) => {
      const baseRadius = getNodeRadius(d.type)
      return d.domain === focusedDomain
        ? baseRadius * nodeRadiusScale.focusedRadius
        : baseRadius * nodeRadiusScale.unfocusedRadius
    })
    .attr('opacity', (d) =>
      d.domain === focusedDomain
        ? opacityValues.focusedNode
        : opacityValues.unfocusedNode
    )
    .attr('stroke-width', (d) =>
      d.domain === focusedDomain
        ? strokeWidths.focusedNodeWidth
        : strokeWidths.unfocusedNodeWidth
    )
    .attr('stroke', (d) => d.domain === focusedDomain ? focusColors.glowColor : unfocusedStrokeColor)
    .attr('filter', (d) =>
      d.domain === focusedDomain ? 'url(#focused-glow)' : 'url(#blur-background)'
    )
}

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
  node.selectAll<SVGCircleElement, SimulationNode>('circle')
    .transition()
    .duration(transitionDuration)
    .attr('r', (d) => getNodeRadius(d.type))
    .attr('opacity', 1)
    .attr('stroke-width', 2)
    .attr('stroke', 'rgba(255, 255, 255, 0.3)')
    .attr('filter', 'none')
}

export interface FocusModeLinkParams {
  link: d3.Selection<SVGPathElement, SimulationLink, SVGGElement, unknown>
  nodes: SimulationNode[]
  focusedDomain: string
  transitionDuration: number
  focusedOpacity: number
  unfocusedOpacity: number
  focusedStrokeWidth: number
  unfocusedStrokeWidth: number
}

export function getLinkNodeId(nodeOrId: SimulationNode | string): string {
  return typeof nodeOrId === 'string' ? nodeOrId : nodeOrId.id
}

export function applyFocusModeLinkStyles({
  link,
  nodes,
  focusedDomain,
  transitionDuration,
  focusedOpacity,
  unfocusedOpacity,
  focusedStrokeWidth,
  unfocusedStrokeWidth,
}: FocusModeLinkParams): void {
  link
    .transition()
    .duration(transitionDuration)
    .attr('opacity', (d) => {
      const sourceNode = nodes.find((n) => n.id === getLinkNodeId(d.source))
      const targetNode = nodes.find((n) => n.id === getLinkNodeId(d.target))
      const isInFocusedDomain =
        sourceNode?.domain === focusedDomain ||
        targetNode?.domain === focusedDomain
      return isInFocusedDomain ? focusedOpacity : unfocusedOpacity
    })
    .attr('stroke-width', (d) => {
      const sourceNode = nodes.find((n) => n.id === getLinkNodeId(d.source))
      const targetNode = nodes.find((n) => n.id === getLinkNodeId(d.target))
      const bothInDomain =
        sourceNode?.domain === focusedDomain &&
        targetNode?.domain === focusedDomain
      return bothInDomain ? focusedStrokeWidth : unfocusedStrokeWidth
    })
    .attr('filter', (d) => {
      const sourceNode = nodes.find((n) => n.id === getLinkNodeId(d.source))
      const targetNode = nodes.find((n) => n.id === getLinkNodeId(d.target))
      const isInFocusedDomain =
        sourceNode?.domain === focusedDomain ||
        targetNode?.domain === focusedDomain
      return isInFocusedDomain ? 'none' : 'url(#blur-background)'
    })
}

export interface ResetModeLinkParams {
  link: d3.Selection<SVGPathElement, SimulationLink, SVGGElement, unknown>
  transitionDuration: number
}

export function applyResetModeLinkStyles({
  link,
  transitionDuration,
}: ResetModeLinkParams): void {
  link
    .transition()
    .duration(transitionDuration)
    .attr('opacity', 0.6)
    .attr('stroke-width', 2)
    .attr('filter', 'none')
}

export interface FocusModeTextParams {
  node: d3.Selection<SVGGElement, SimulationNode, SVGGElement, unknown>
  focusedDomain: string
  transitionDuration: number
  selector: string
  focusedOpacity: number
  focusedFontSize: string
  focusedFontWeight: number
  unfocusedFontSize: string
  unfocusedFontWeight: number
}

export function applyFocusModeTextStyles({
  node,
  focusedDomain,
  transitionDuration,
  selector,
  focusedOpacity,
  focusedFontSize,
  focusedFontWeight,
  unfocusedFontSize,
  unfocusedFontWeight,
}: FocusModeTextParams): void {
  node.selectAll<SVGTextElement, SimulationNode>(selector)
    .transition()
    .duration(transitionDuration)
    .attr('opacity', (d) => (d.domain === focusedDomain ? focusedOpacity : 0))
    .attr('font-size', (d) =>
      d.domain === focusedDomain ? focusedFontSize : unfocusedFontSize
    )
    .attr('font-weight', (d) =>
      d.domain === focusedDomain ? focusedFontWeight : unfocusedFontWeight
    )
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
  node.selectAll<SVGTextElement, SimulationNode>(selector)
    .transition()
    .duration(transitionDuration)
    .attr('opacity', opacity)
    .attr('font-size', fontSize)
    .attr('font-weight', fontWeight)
}
