import * as d3 from 'd3'
import type {
  SimulationNode, SimulationLink 
} from '../graph-types'
import type { Theme } from '@/types/theme'
import { getThemeFocusColors } from '@/platform/domain/theme-focus-colors'
import {
  applyResetModeCircleStyles,
  applyResetModeLinkStyles,
  applyResetModeTextStyles,
} from './GraphRenderingSetup'
import { getNodeRadius } from './VisualizationDataAdapters'
import { FOCUS_MODE_TRANSITIONS } from '@/platform/domain/focus-mode-constants'

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

  applyResetMode({
    node,
    link,
  })
  node
    .selectAll<SVGCircleElement, SimulationNode>('circle')
    .transition()
    .duration(FOCUS_MODE_TRANSITIONS.elementAnimation)
    .attr('stroke', (datum) =>
      datum.domain === domain ? focusColors.glowColor : 'rgba(255, 255, 255, 0.3)',
    )
    .attr('stroke-width', (datum) => (datum.domain === domain ? 5 : 2))
    .attr('filter', (datum) => (datum.domain === domain ? 'url(#focused-glow)' : 'none'))
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
