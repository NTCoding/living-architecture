import * as d3 from 'd3'
import type {
  SimulationNode, SimulationLink 
} from '../../types'
import type { Theme } from '@/types/theme'
import { getThemeFocusColors } from '../../graphFocusing/themeFocusColors'
import {
  FOCUS_MODE_TRANSITIONS,
  FOCUS_MODE_NODE_SCALES,
  FOCUS_MODE_OPACITY,
  FOCUS_MODE_STROKES,
  FOCUS_MODE_TEXT,
  UNFOCUSED_NODE_STROKE_COLOR,
} from '../../graphFocusing/focusModeConstants'
import {
  applyFocusModeCircleStyles,
  applyResetModeCircleStyles,
  applyFocusModeLinkStyles,
  applyResetModeLinkStyles,
  applyFocusModeTextStyles,
  applyResetModeTextStyles,
  calculateFocusModeZoom,
} from './GraphRenderingSetup'
import { getNodeRadius } from './VisualizationDataAdapters'

export interface ApplyFocusModeParams {
  svg: d3.Selection<SVGSVGElement, unknown, d3.BaseType, unknown>
  node: d3.Selection<SVGGElement, SimulationNode, SVGGElement, unknown>
  link: d3.Selection<SVGPathElement, SimulationLink, SVGGElement, unknown>
  zoom: d3.ZoomBehavior<SVGSVGElement, unknown>
  nodes: SimulationNode[]
  domain: string
  theme: Theme
  dimensions: {
    width: number
    height: number
  }
}

export function applyFocusMode(params: ApplyFocusModeParams): void {
  const {
    svg, node, link, zoom, nodes, domain, theme, dimensions 
  } = params
  const focusColors = getThemeFocusColors(theme)

  applyFocusModeCircleStyles({
    node,
    focusedDomain: domain,
    focusColors,
    transitionDuration: FOCUS_MODE_TRANSITIONS.elementAnimation,
    nodeRadiusScale: FOCUS_MODE_NODE_SCALES,
    opacityValues: FOCUS_MODE_OPACITY,
    strokeWidths: FOCUS_MODE_STROKES,
    getNodeRadius,
    unfocusedStrokeColor: UNFOCUSED_NODE_STROKE_COLOR,
  })

  applyFocusModeTextStyles({
    node,
    focusedDomain: domain,
    transitionDuration: FOCUS_MODE_TRANSITIONS.elementAnimation,
    selector: '.node-label',
    focusedOpacity: 1,
    focusedFontSize: FOCUS_MODE_TEXT.focusedLabelSize,
    focusedFontWeight: FOCUS_MODE_TEXT.focusedLabelWeight,
    unfocusedFontSize: FOCUS_MODE_TEXT.unfocusedLabelSize,
    unfocusedFontWeight: FOCUS_MODE_TEXT.unfocusedLabelWeight,
  })

  applyFocusModeTextStyles({
    node,
    focusedDomain: domain,
    transitionDuration: FOCUS_MODE_TRANSITIONS.elementAnimation,
    selector: '.node-domain-label',
    focusedOpacity: 1,
    focusedFontSize: FOCUS_MODE_TEXT.focusedDomainSize,
    focusedFontWeight: FOCUS_MODE_TEXT.focusedDomainWeight,
    unfocusedFontSize: FOCUS_MODE_TEXT.unfocusedDomainSize,
    unfocusedFontWeight: FOCUS_MODE_TEXT.unfocusedDomainWeight,
  })

  applyFocusModeLinkStyles({
    link,
    nodes,
    focusedDomain: domain,
    transitionDuration: FOCUS_MODE_TRANSITIONS.elementAnimation,
    focusedOpacity: FOCUS_MODE_OPACITY.focusedEdge,
    unfocusedOpacity: FOCUS_MODE_OPACITY.unfocusedEdge,
    focusedStrokeWidth: FOCUS_MODE_STROKES.focusedEdgeWidth,
    unfocusedStrokeWidth: FOCUS_MODE_STROKES.unfocusedEdgeWidth,
  })

  const focusZoom = calculateFocusModeZoom({
    nodes,
    focusedDomain: domain,
    dimensions,
  })

  if (focusZoom) {
    svg
      .transition()
      .duration(FOCUS_MODE_TRANSITIONS.zoomAnimation)
      .call(
        zoom.transform,
        d3.zoomIdentity
          .translate(focusZoom.translateX, focusZoom.translateY)
          .scale(focusZoom.scale),
      )
  }
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
