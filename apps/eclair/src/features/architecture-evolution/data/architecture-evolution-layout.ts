import * as Viz from '@viz-js/viz'
import type { Edge, Node } from '@xyflow/react'

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

export interface GraphvizLayoutResult<TNode extends Node = Node> {
  readonly nodes: readonly TNode[]
  readonly boundaries: readonly GraphvizBoundary[]
  readonly edgePathsById: ReadonlyMap<string, string>
}

interface ClusterDefinition {
  readonly id: string
  readonly label: string
  readonly kind: GraphvizBoundaryKind
  readonly nodeIds: readonly string[]
}

const vizInstancePromise = Viz.instance()
const PX_PER_INCH = 72
const NODE_WIDTH = 208
const NODE_HEIGHT = 76
const NODE_SEPARATION = 1.8
const RANK_SEPARATION = 1.8
const CANVAS_MARGIN = 40

function escapeDotLabel(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

function getNodeKind(node: Node<Record<string, unknown>>): string | null {
  return typeof node.data['kind'] === 'string' ? node.data['kind'] : null
}

function getNodeSuffix(nodeId: string): string | null {
  const segments = nodeId.split('-')
  return segments.length < 2 ? null : (segments[segments.length - 1] ?? null)
}

function getClusterDefinitions<TNode extends Node<Record<string, unknown>>>(
  nodes: readonly TNode[],
): readonly ClusterDefinition[] {
  const servicesBySuffix = new Map<string, string[]>()
  const databasesBySuffix = new Map<string, string[]>()

  for (const node of nodes) {
    const kind = getNodeKind(node)

    const suffix = getNodeSuffix(node.id)

    if (suffix === null) {
      continue
    }

    if (kind === 'service') {
      servicesBySuffix.set(suffix, [...(servicesBySuffix.get(suffix) ?? []), node.id])
    }

    if (kind === 'database') {
      databasesBySuffix.set(suffix, [...(databasesBySuffix.get(suffix) ?? []), node.id])
    }
  }

  const sliceClusters: ClusterDefinition[] = [...servicesBySuffix.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .flatMap(([suffix, serviceIds]) => {
      const databaseIds = databasesBySuffix.get(suffix) ?? []

      if (serviceIds.length === 0 || databaseIds.length === 0) {
        return []
      }

      return [
        {
          id: `cluster_slice_${suffix}`,
          label: `Orders Domain ${suffix.toUpperCase()}`,
          kind: 'slice' as const,
          nodeIds: [...serviceIds, ...databaseIds],
        },
      ]
    })

  return sliceClusters
}

function renderNode(node: Node<Record<string, unknown>>, indent: string): string {
  const label = typeof node.data['label'] === 'string' ? node.data['label'] : node.id
  return `${indent}"${node.id}" [width=${NODE_WIDTH / PX_PER_INCH},height=${NODE_HEIGHT / PX_PER_INCH},fixedsize=true,id="${node.id}",label="${escapeDotLabel(label)}"]`
}

function createDot<TNode extends Node<Record<string, unknown>>>(
  nodes: readonly TNode[],
  edges: readonly Edge[],
): { readonly dot: string; readonly clusters: readonly ClusterDefinition[] } {
  const clusters = getClusterDefinitions(nodes)
  const sliceClusters = clusters.filter((cluster) => cluster.kind === 'slice')
  const lines = [
    'digraph {',
    '  compound=true',
    '  clusterrank=local',
    `  graph [splines=polyline,rankdir=TB,ranksep=${RANK_SEPARATION},nodesep=${NODE_SEPARATION},newrank=true]`,
    '  node [shape=box,fontsize=5]',
    '  edge [fontsize=5]',
  ]

  for (const cluster of sliceClusters) {
    lines.push(`  subgraph ${cluster.id} {`)
    lines.push(`    label="${cluster.label}"`)
    lines.push('    labelloc="b"')
    lines.push('    labeljust="l"')
    lines.push('    margin=20')

    for (const nodeId of cluster.nodeIds) {
      const node = nodes.find((candidate) => candidate.id === nodeId)

      if (node !== undefined) {
        lines.push(renderNode(node, '    '))
      }
    }

    lines.push('  }')
  }

  for (const node of nodes) {
    const kind = getNodeKind(node)

    if (kind === 'service' || kind === 'database') {
      continue
    }

    lines.push(renderNode(node, '  '))
  }

  const externalNodeIds = nodes
    .filter((node) => {
      const kind = getNodeKind(node)
      return kind !== 'service' && kind !== 'database'
    })
    .map((node) => node.id)

  if (externalNodeIds.length > 1) {
    lines.push(`  { rank=same; ${externalNodeIds.map((nodeId) => `"${nodeId}"`).join('; ')} }`)
  }

  for (const edge of edges) {
    lines.push(`  "${edge.source}" -> "${edge.target}" [id="${edge.id}"]`)
  }

  lines.push('}')

  return {
    dot: lines.join('\n'),
    clusters,
  }
}

function parseTranslate(transform: string | null): { readonly x: number; readonly y: number } {
  if (transform === null) {
    return { x: 0, y: 0 }
  }

  const match = /translate\(([-\d.]+)\s+([-\d.]+)\)/.exec(transform)

  if (match === null) {
    return { x: 0, y: 0 }
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
): { readonly x: number; readonly y: number; readonly width: number; readonly height: number } {
  const points = polygon.points
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  for (let index = 0; index < points.numberOfItems; index += 1) {
    const point = points.getItem(index)
    const x = point.x + translateX
    const y = point.y + translateY

    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  }
}

function translatePathData(pathData: string, deltaX: number, deltaY: number): string {
  return pathData.replace(/(-?\d*\.?\d+),(-?\d*\.?\d+)/g, (_match, x, y) => {
    return `${Number(x) + deltaX},${Number(y) + deltaY}`
  })
}

function getPathBounds(pathData: string): {
  readonly minX: number
  readonly minY: number
  readonly maxX: number
  readonly maxY: number
} {
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  for (const match of pathData.matchAll(/(-?\d*\.?\d+),(-?\d*\.?\d+)/g)) {
    const x = Number(match[1])
    const y = Number(match[2])
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
  }

  return { minX, minY, maxX, maxY }
}

function getClusterTitle(group: Element): string | null {
  const title = group.querySelector('title')?.textContent?.trim()
  return title === undefined || title.length === 0 ? null : title
}

export async function applyGraphvizLayout<TNode extends Node<Record<string, unknown>>>(
  nodes: readonly TNode[],
  edges: readonly Edge[],
): Promise<GraphvizLayoutResult<TNode>> {
  const { dot, clusters } = createDot(nodes, edges)
  const clusterById = new Map(clusters.map((cluster) => [cluster.id, cluster]))
  const viz = await vizInstancePromise
  const svgMarkup = viz.renderString(dot, {
    engine: 'dot',
    format: 'svg',
  })
  const svgDocument = new DOMParser().parseFromString(svgMarkup, 'image/svg+xml')
  const graphGroup = svgDocument.querySelector('svg > g.graph')

  if (!(graphGroup instanceof SVGGElement)) {
    throw new TypeError('Graphviz output did not contain a graph group')
  }

  const translation = parseTranslate(graphGroup.getAttribute('transform'))
  const nodeBoundsById = new Map<string, { x: number; y: number; width: number; height: number }>()
  const boundaries: GraphvizBoundary[] = []
  let minimumX = Number.POSITIVE_INFINITY
  let minimumY = Number.POSITIVE_INFINITY
  let maximumX = Number.NEGATIVE_INFINITY
  let maximumY = Number.NEGATIVE_INFINITY

  for (const clusterGroup of svgDocument.querySelectorAll('g.cluster')) {
    const clusterId = getClusterTitle(clusterGroup)
    const cluster = clusterId === null ? undefined : clusterById.get(clusterId)
    const polygon = clusterGroup.querySelector('polygon')

    if (cluster === undefined || !(polygon instanceof SVGPolygonElement)) {
      continue
    }

    const bounds = parsePolygonBounds(polygon, translation.x, translation.y)
    minimumX = Math.min(minimumX, bounds.x)
    minimumY = Math.min(minimumY, bounds.y)
    maximumX = Math.max(maximumX, bounds.x + bounds.width)
    maximumY = Math.max(maximumY, bounds.y + bounds.height)

    boundaries.push({
      id: cluster.id,
      label: cluster.label,
      kind: cluster.kind,
      ...bounds,
    })
  }

  for (const node of nodes) {
    const group = svgDocument.querySelector(`g[id="${node.id}"]`)
    const polygon = group?.querySelector('polygon')

    if (!(polygon instanceof SVGPolygonElement)) {
      continue
    }

    const bounds = parsePolygonBounds(polygon, translation.x, translation.y)
    nodeBoundsById.set(node.id, bounds)
    minimumX = Math.min(minimumX, bounds.x)
    minimumY = Math.min(minimumY, bounds.y)
    maximumX = Math.max(maximumX, bounds.x + bounds.width)
    maximumY = Math.max(maximumY, bounds.y + bounds.height)
  }

  const translatedPathsById = new Map<string, string>()

  for (const edge of edges) {
    const group = svgDocument.querySelector(`g[id="${edge.id}"]`)
    const path = group?.querySelector('path')

    if (!(path instanceof SVGPathElement)) {
      continue
    }

    const translatedPath = translatePathData(
      path.getAttribute('d') ?? '',
      translation.x,
      translation.y,
    )
    const bounds = getPathBounds(translatedPath)

    minimumX = Math.min(minimumX, bounds.minX)
    minimumY = Math.min(minimumY, bounds.minY)
    maximumX = Math.max(maximumX, bounds.maxX)
    maximumY = Math.max(maximumY, bounds.maxY)
    translatedPathsById.set(edge.id, translatedPath)
  }

  const deltaX = CANVAS_MARGIN - minimumX
  const deltaY = CANVAS_MARGIN - minimumY
  return {
    nodes: nodes.map((node) => {
      const bounds = nodeBoundsById.get(node.id)

      if (bounds === undefined) {
        return node
      }

      return {
        ...node,
        width: bounds.width,
        height: bounds.height,
        position: {
          x: bounds.x + deltaX,
          y: bounds.y + deltaY,
        },
      }
    }),
    boundaries: boundaries.map((boundary) => ({
      ...boundary,
      x: boundary.x + deltaX,
      y: boundary.y + deltaY,
    })),
    edgePathsById: new Map(
      [...translatedPathsById.entries()].map(([edgeId, pathData]) => {
        return [edgeId, translatePathData(pathData, deltaX, deltaY)]
      }),
    ),
  }
}
