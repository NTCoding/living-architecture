import type {
  Edge, Node 
} from '@xyflow/react'

export type GraphvizBoundaryKind = 'slice'

export interface GraphvizBoundary {
  readonly id: string
  readonly label: string
  readonly kind: GraphvizBoundaryKind
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

interface ClusterDefinition {
  readonly id: string
  readonly label: string
  readonly kind: GraphvizBoundaryKind
  readonly nodeIds: readonly string[]
}

interface LayoutBounds {
  readonly minX: number
  readonly minY: number
  readonly maxX: number
  readonly maxY: number
}

const createBounds = (): LayoutBounds => ({
  minX: Number.POSITIVE_INFINITY,
  minY: Number.POSITIVE_INFINITY,
  maxX: Number.NEGATIVE_INFINITY,
  maxY: Number.NEGATIVE_INFINITY,
})

const mergeBounds = (bounds: readonly LayoutBounds[]): LayoutBounds => {
  return bounds.reduce(
    (accumulator, bound) => ({
      minX: Math.min(accumulator.minX, bound.minX),
      minY: Math.min(accumulator.minY, bound.minY),
      maxX: Math.max(accumulator.maxX, bound.maxX),
      maxY: Math.max(accumulator.maxY, bound.maxY),
    }),
    createBounds(),
  )
}

export function parseTranslate(transform: string | null): {
  readonly x: number
  readonly y: number
} {
  if (transform === null) {
    return {
      x: 0,
      y: 0,
    }
  }

  const match = /translate\(([-\d.]+)\s+([-\d.]+)\)/.exec(transform)
  if (match === null)
    return {
      x: 0,
      y: 0,
    }

  return {
    x: Number(match[1]),
    y: Number(match[2]),
  }
}

function parsePolygonBounds(
  polygon: SVGPolygonElement,
  translateX: number,
  translateY: number,
): {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
} {
  const bounds = Array.from({ length: polygon.points.numberOfItems }, (_, index) => {
    return polygon.points.getItem(index)
  }).reduce((accumulator, point) => {
    const x = point.x + translateX
    const y = point.y + translateY

    return {
      minX: Math.min(accumulator.minX, x),
      minY: Math.min(accumulator.minY, y),
      maxX: Math.max(accumulator.maxX, x),
      maxY: Math.max(accumulator.maxY, y),
    }
  }, createBounds())

  return {
    x: bounds.minX,
    y: bounds.minY,
    width: bounds.maxX - bounds.minX,
    height: bounds.maxY - bounds.minY,
  }
}

function stripCommandPrefix(token: string): {
  readonly prefix: string
  readonly value: string
} {
  if (token.length === 0) {
    return {
      prefix: '',
      value: token,
    }
  }

  const firstCharacter = token.charAt(0)

  if (
    firstCharacter === '' ||
    !(
      (firstCharacter >= 'A' && firstCharacter <= 'Z') ||
      (firstCharacter >= 'a' && firstCharacter <= 'z')
    )
  ) {
    return {
      prefix: '',
      value: token,
    }
  }

  return {
    prefix: firstCharacter,
    value: token.slice(1),
  }
}

function transformCoordinateToken(
  token: string,
  transformPoint: (
    x: number,
    y: number,
  ) => {
    readonly x: number
    readonly y: number
  },
): string {
  if (!token.includes(',')) return token

  const {
    prefix, value 
  } = stripCommandPrefix(token)
  const coordinates = value.split(',')
  if (coordinates.length !== 2) return token

  const x = Number(coordinates[0])
  const y = Number(coordinates[1])
  if (Number.isNaN(x) || Number.isNaN(y)) return token

  const transformed = transformPoint(x, y)
  return `${prefix}${transformed.x},${transformed.y}`
}

function transformPathData(
  pathData: string,
  transformPoint: (
    x: number,
    y: number,
  ) => {
    readonly x: number
    readonly y: number
  },
): string {
  return pathData
    .split(' ')
    .map((token) => transformCoordinateToken(token, transformPoint))
    .join(' ')
}

export function translatePathData(pathData: string, deltaX: number, deltaY: number): string {
  return transformPathData(pathData, (x, y) => ({
    x: x + deltaX,
    y: y + deltaY,
  }))
}

function getPathBounds(pathData: string): {
  readonly minX: number
  readonly minY: number
  readonly maxX: number
  readonly maxY: number
} {
  return pathData.split(' ').reduce((accumulator, token) => {
    const transformedToken = transformCoordinateToken(token, (x, y) => ({
      x,
      y,
    }))
    if (transformedToken === token || !transformedToken.includes(',')) return accumulator

    const { value } = stripCommandPrefix(transformedToken)
    const coordinates = value.split(',')
    if (coordinates.length !== 2) return accumulator

    const x = Number(coordinates[0])
    const y = Number(coordinates[1])
    if (Number.isNaN(x) || Number.isNaN(y)) return accumulator

    return {
      minX: Math.min(accumulator.minX, x),
      minY: Math.min(accumulator.minY, y),
      maxX: Math.max(accumulator.maxX, x),
      maxY: Math.max(accumulator.maxY, y),
    }
  }, createBounds())
}

function getClusterTitle(group: Element): string | null {
  const title = group.querySelector('title')?.textContent?.trim()
  return title === undefined || title.length === 0 ? null : title
}

export function collectClusterBoundaries(
  svgDocument: XMLDocument,
  clusterById: ReadonlyMap<string, ClusterDefinition>,
  translation: {
    readonly x: number
    readonly y: number
  },
): {
  readonly boundaries: readonly GraphvizBoundary[]
  readonly bounds: LayoutBounds
} {
  const boundaries: GraphvizBoundary[] = []

  for (const clusterGroup of svgDocument.querySelectorAll('g.cluster')) {
    const clusterId = getClusterTitle(clusterGroup)
    const cluster = clusterId === null ? undefined : clusterById.get(clusterId)
    const polygon = clusterGroup.querySelector('polygon')

    if (cluster === undefined || !(polygon instanceof SVGPolygonElement)) continue

    const bounds = parsePolygonBounds(polygon, translation.x, translation.y)
    boundaries.push({
      id: cluster.id,
      label: cluster.label,
      kind: cluster.kind,
      ...bounds,
    })
  }

  return {
    boundaries,
    bounds: mergeBounds(
      boundaries.map((boundary) => ({
        minX: boundary.x,
        minY: boundary.y,
        maxX: boundary.x + boundary.width,
        maxY: boundary.y + boundary.height,
      })),
    ),
  }
}

export function collectNodeBounds(
  svgDocument: XMLDocument,
  nodes: readonly Node<Record<string, unknown>>[],
  translation: {
    readonly x: number
    readonly y: number
  },
): {
  readonly nodeBoundsById: ReadonlyMap<
    string,
    {
      x: number
      y: number
      width: number
      height: number
    }
  >
  readonly bounds: LayoutBounds
} {
  const nodeBoundsById = new Map<
    string,
    {
      x: number
      y: number
      width: number
      height: number
    }
  >()
  const nodeBounds: LayoutBounds[] = []

  for (const node of nodes) {
    const group = svgDocument.querySelector(`g[id="${node.id}"]`)
    const polygon = group?.querySelector('polygon')

    if (!(polygon instanceof SVGPolygonElement)) continue

    const bounds = parsePolygonBounds(polygon, translation.x, translation.y)
    nodeBoundsById.set(node.id, bounds)
    nodeBounds.push({
      minX: bounds.x,
      minY: bounds.y,
      maxX: bounds.x + bounds.width,
      maxY: bounds.y + bounds.height,
    })
  }

  return {
    nodeBoundsById,
    bounds: mergeBounds(nodeBounds),
  }
}

export function collectEdgePaths(
  svgDocument: XMLDocument,
  edges: readonly Edge[],
  translation: {
    readonly x: number
    readonly y: number
  },
): {
  readonly edgePathsById: ReadonlyMap<string, string>
  readonly bounds: LayoutBounds
} {
  const edgePathsById = new Map<string, string>()
  const edgeBounds: LayoutBounds[] = []

  for (const edge of edges) {
    const group = svgDocument.querySelector(`g[id="${edge.id}"]`)
    const path = group?.querySelector('path')

    if (!(path instanceof SVGPathElement)) continue

    const pathData = path.getAttribute('d')
    if (pathData === null) {
      throw new TypeError(`Expected path data for edge ${edge.id}`)
    }

    const translatedPath = translatePathData(pathData, translation.x, translation.y)
    edgePathsById.set(edge.id, translatedPath)
    edgeBounds.push(getPathBounds(translatedPath))
  }

  return {
    edgePathsById,
    bounds: mergeBounds(edgeBounds),
  }
}
