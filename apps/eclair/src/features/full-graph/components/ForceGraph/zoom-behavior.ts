import * as d3 from 'd3'
import type { SimulationNode } from '../../types'
import { extractCoordinates } from './highlight-behavior'

export interface FitViewportParams {
  nodes: SimulationNode[]
  dimensions: {
    width: number
    height: number
  }
  padding: number
}

export function calculateFitViewportTransform(params: FitViewportParams): {
  translateX: number
  translateY: number
  scale: number
} {
  if (params.nodes.length === 0) {
    return {
      translateX: 0,
      translateY: 0,
      scale: 1,
    }
  }

  const xs = extractCoordinates(params.nodes, 'x')
  const ys = extractCoordinates(params.nodes, 'y')

  const minX = Math.min(...xs) - params.padding
  const maxX = Math.max(...xs) + params.padding
  const minY = Math.min(...ys) - params.padding
  const maxY = Math.max(...ys) + params.padding

  const graphWidth = maxX - minX
  const graphHeight = maxY - minY
  const scale = Math.min(
    params.dimensions.width / graphWidth,
    params.dimensions.height / graphHeight,
    1,
  )
  const translateX = (params.dimensions.width - graphWidth * scale) / 2 - minX * scale
  const translateY = (params.dimensions.height - graphHeight * scale) / 2 - minY * scale

  return {
    translateX,
    translateY,
    scale,
  }
}

export interface FocusModeZoomParams {
  nodes: SimulationNode[]
  focusedDomain: string
  dimensions: {
    width: number
    height: number
  }
}

export function calculateFocusModeZoom(params: FocusModeZoomParams): {
  translateX: number
  translateY: number
  scale: number
} | null {
  const {
    nodes, focusedDomain, dimensions 
  } = params
  const focusedNodes = nodes.filter((n) => n.domain === focusedDomain)

  if (focusedNodes.length === 0) return null

  const xs = extractCoordinates(focusedNodes, 'x')
  const ys = extractCoordinates(focusedNodes, 'y')

  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)

  const centerX = (minX + maxX) / 2
  const centerY = (minY + maxY) / 2
  const width = maxX - minX + 200
  const height = maxY - minY + 200

  const scale = Math.min(dimensions.width / width, dimensions.height / height, 2.5)

  const translateX = dimensions.width / 2 - centerX * scale
  const translateY = dimensions.height / 2 - centerY * scale

  return {
    translateX,
    translateY,
    scale,
  }
}

export interface ApplyDagrePositionsParams {
  nodes: SimulationNode[]
  positions: Map<
    string,
    {
      x: number
      y: number
    }
  >
}

export function applyDagrePositions(params: ApplyDagrePositionsParams): void {
  const {
    nodes, positions 
  } = params

  for (const node of nodes) {
    const pos = positions.get(node.id)
    if (pos) {
      node.x = pos.x
      node.y = pos.y
    }
  }
}

export interface ZoomBehaviorOptions {onInteractionStart?: () => void}

export function setupZoomBehavior(
  svg: d3.Selection<SVGSVGElement, unknown, d3.BaseType, unknown>,
  g: d3.Selection<SVGGElement, unknown, d3.BaseType, unknown>,
  options?: ZoomBehaviorOptions,
): ReturnType<typeof d3.zoom<SVGSVGElement, unknown>> {
  const zoom = d3
    .zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.2, 4])
    .on('start', () => {
      options?.onInteractionStart?.()
    })
    .on('zoom', (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
      g.attr('transform', event.transform.toString())
    })

  svg.call(zoom)
  return zoom
}
