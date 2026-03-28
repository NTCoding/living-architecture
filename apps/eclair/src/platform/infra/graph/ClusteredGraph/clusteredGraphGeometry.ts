import type { SimulationNode } from '../graph-types'
import type { DomainCircle } from './computeCircleEnclosures'
import { getNodeRadius } from '../ForceGraph/VisualizationDataAdapters'

const CLUSTER_LABEL_MIN_FONT_SIZE = 60
const CLUSTER_LABEL_MAX_FONT_SIZE = 84
const CLUSTER_LABEL_GAP = 20

export const CLUSTER_LABEL_STROKE_WIDTH = 14

export function getClusterLabelFontSize(circle: DomainCircle): number {
  return Math.max(
    CLUSTER_LABEL_MIN_FONT_SIZE,
    Math.min(CLUSTER_LABEL_MAX_FONT_SIZE, circle.r * 0.42),
  )
}

export function getClusterLabelY(circle: DomainCircle): number {
  return circle.y - circle.r - CLUSTER_LABEL_GAP
}

function getClusterLabelTop(circle: DomainCircle): number {
  return getClusterLabelY(circle) - getClusterLabelFontSize(circle)
}

function calculateGraphBounds(
  nodes: readonly SimulationNode[],
  circles: readonly DomainCircle[],
): {
  readonly minX: number
  readonly minY: number
  readonly maxX: number
  readonly maxY: number
} {
  const circleBounds = circles.map((circle) => ({
    minX: circle.x - circle.r,
    minY: getClusterLabelTop(circle) - 12,
    maxX: circle.x + circle.r,
    maxY: circle.y + circle.r,
  }))
  const nodeBounds = nodes.flatMap((node) => {
    if (node.x === undefined || node.y === undefined) {
      return []
    }

    const radius = getNodeRadius(node.type) + 32
    return [
      {
        minX: node.x - radius,
        minY: node.y - radius,
        maxX: node.x + radius,
        maxY: node.y + radius + 22,
      },
    ]
  })
  const bounds = [...circleBounds, ...nodeBounds]

  if (bounds.length === 0) {
    return {
      minX: 0,
      minY: 0,
      maxX: 0,
      maxY: 0,
    }
  }

  return {
    minX: Math.min(...bounds.map((bound) => bound.minX)),
    minY: Math.min(...bounds.map((bound) => bound.minY)),
    maxX: Math.max(...bounds.map((bound) => bound.maxX)),
    maxY: Math.max(...bounds.map((bound) => bound.maxY)),
  }
}

export function calculateViewportTransform(params: {
  readonly nodes: readonly SimulationNode[]
  readonly circles: readonly DomainCircle[]
  readonly width: number
  readonly height: number
  readonly padding: number
}): {
  readonly translateX: number
  readonly translateY: number
  readonly scale: number
} {
  const bounds = calculateGraphBounds(params.nodes, params.circles)
  const graphWidth = Math.max(bounds.maxX - bounds.minX + params.padding * 2, 1)
  const graphHeight = Math.max(bounds.maxY - bounds.minY + params.padding * 2, 1)
  const scale = Math.min(params.width / graphWidth, params.height / graphHeight, 1)
  const translateX = params.width / 2 - ((bounds.minX + bounds.maxX) / 2) * scale
  const translateY = params.height / 2 - ((bounds.minY + bounds.maxY) / 2) * scale

  return {
    translateX,
    translateY,
    scale,
  }
}

export function calculateCircleFocusTransform(params: {
  readonly circle: DomainCircle
  readonly width: number
  readonly height: number
}): {
  readonly translateX: number
  readonly translateY: number
  readonly scale: number
} {
  const focusDiameter = params.circle.r * 2 + 180
  const scale = Math.min(params.width / focusDiameter, params.height / focusDiameter, 2.2)

  return {
    translateX: params.width / 2 - params.circle.x * scale,
    translateY: params.height / 2 - params.circle.y * scale,
    scale,
  }
}
