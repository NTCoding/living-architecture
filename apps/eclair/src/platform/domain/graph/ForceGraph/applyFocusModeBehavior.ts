import * as d3 from 'd3'
import type { SimulationNode, SimulationLink } from '../graph-types'
import type { Theme } from '@/platform/domain/theme/theme'
import { getThemeFocusColors } from '@/platform/domain/theme-focus-colors'
import {
  applyResetModeCircleStyles,
  applyResetModeLinkStyles,
  applyResetModeTextStyles,
} from './GraphRenderingSetup'
import { getNodeRadius } from './VisualizationDataAdapters'
import { FOCUS_MODE_TRANSITIONS } from '@/platform/domain/focus-mode-constants'
import { getLinkNodeId } from './FocusModeStyling'

export interface ApplyFocusModeParams {
  node: d3.Selection<SVGGElement, SimulationNode, SVGGElement, unknown>
  link: d3.Selection<SVGPathElement, SimulationLink, SVGGElement, unknown>
  domain: string
  theme: Theme
}

export function applyFocusMode(params: ApplyFocusModeParams): void {
  const node = params.node
  const link = params.link
  const domain = params.domain
  const theme = params.theme
  const focusColors = getThemeFocusColors(theme)
  const focusedNodeIds = new Set(
    node
      .data()
      .filter((datum) => datum.domain === domain)
      .map((datum) => datum.id),
  )

  applyResetMode({
    node,
    link,
  })
  node
    .selectAll<SVGCircleElement, SimulationNode>('circle')
    .transition()
    .duration(FOCUS_MODE_TRANSITIONS.elementAnimation)
    .attr('stroke', (datum) =>
      datum.domain === domain ? focusColors.glowColor : 'rgba(128, 128, 128, 0.12)',
    )
    .attr('stroke-width', (datum) => (datum.domain === domain ? 8 : 1))
    .attr('opacity', (datum) => (datum.domain === domain ? 1 : 0.22))
    .attr('filter', (datum) => (datum.domain === domain ? 'url(#focused-glow)' : 'none'))

  node
    .selectAll<SVGTextElement, SimulationNode>('.node-label, .node-domain-label')
    .transition()
    .duration(FOCUS_MODE_TRANSITIONS.elementAnimation)
    .attr('opacity', (datum) => (datum.domain === domain ? 1 : 0.16))

  link
    .transition()
    .duration(FOCUS_MODE_TRANSITIONS.elementAnimation)
    .attr('opacity', (datum) => {
      const connectsFocusedNode =
        focusedNodeIds.has(getLinkNodeId(datum.source)) ||
        focusedNodeIds.has(getLinkNodeId(datum.target))
      return connectsFocusedNode ? 0.75 : 0.08
    })
    .attr('stroke-width', (datum) => {
      const connectsFocusedNode =
        focusedNodeIds.has(getLinkNodeId(datum.source)) ||
        focusedNodeIds.has(getLinkNodeId(datum.target))
      return connectsFocusedNode ? 2.5 : 1
    })
}

export interface ApplyResetModeParams {
  node: d3.Selection<SVGGElement, SimulationNode, SVGGElement, unknown>
  link: d3.Selection<SVGPathElement, SimulationLink, SVGGElement, unknown>
}

export function applyResetMode(params: ApplyResetModeParams): void {
  const {
    node, link 
  } = params

  applyResetModeCircleStyles({
    node,
    transitionDuration: FOCUS_MODE_TRANSITIONS.elementAnimation,
    getNodeRadius,
  })

  applyResetModeTextStyles({
    node,
    transitionDuration: FOCUS_MODE_TRANSITIONS.elementAnimation,
    selector: '.node-label',
    opacity: 1,
    fontSize: '11px',
    fontWeight: 600,
  })

  applyResetModeTextStyles({
    node,
    transitionDuration: FOCUS_MODE_TRANSITIONS.elementAnimation,
    selector: '.node-domain-label',
    opacity: 1,
    fontSize: '9px',
    fontWeight: 500,
  })

  applyResetModeLinkStyles({
    link,
    transitionDuration: FOCUS_MODE_TRANSITIONS.elementAnimation,
  })
}
