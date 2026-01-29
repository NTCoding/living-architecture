import * as d3 from 'd3'
import type { Theme } from '@/types/theme'
import {
  EDGE_COLORS, SEMANTIC_EDGE_COLORS 
} from '../../types'

function appendArrowMarker(
  defs: d3.Selection<SVGDefsElement, unknown, d3.BaseType, unknown>,
  id: string,
  fill: string,
): void {
  defs
    .append('marker')
    .attr('id', id)
    .attr('viewBox', '0 -5 10 10')
    .attr('refX', 8)
    .attr('refY', 0)
    .attr('markerWidth', 6)
    .attr('markerHeight', 6)
    .attr('orient', 'auto')
    .append('path')
    .attr('d', 'M0,-5L10,0L0,5')
    .attr('fill', fill)
}

export function setupSVGFiltersAndMarkers(
  defs: d3.Selection<SVGDefsElement, unknown, d3.BaseType, unknown>,
  theme: Theme,
): void {
  defs
    .append('filter')
    .attr('id', 'blur-background')
    .append('feGaussianBlur')
    .attr('stdDeviation', 3)

  defs
    .append('filter')
    .attr('id', 'focused-glow')
    .append('feGaussianBlur')
    .attr('stdDeviation', 4)
    .attr('result', 'coloredBlur')

  const glowFilter = defs.select('#focused-glow')
  glowFilter.append('feMerge').call((merge) => {
    merge.append('feMergeNode').attr('in', 'coloredBlur')
    merge.append('feMergeNode').attr('in', 'SourceGraphic')
  })

  appendArrowMarker(defs, 'arrowhead-sync', EDGE_COLORS[theme].sync)
  appendArrowMarker(defs, 'arrowhead-async', EDGE_COLORS[theme].async)

  appendArrowMarker(defs, 'arrowhead-event', SEMANTIC_EDGE_COLORS[theme].event)
  appendArrowMarker(defs, 'arrowhead-eventHandler', SEMANTIC_EDGE_COLORS[theme].eventHandler)
  appendArrowMarker(defs, 'arrowhead-external', SEMANTIC_EDGE_COLORS[theme].external)
  appendArrowMarker(defs, 'arrowhead-default', SEMANTIC_EDGE_COLORS[theme].default)
}
