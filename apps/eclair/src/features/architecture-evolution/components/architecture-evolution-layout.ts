import * as Viz from '@viz-js/viz'
import type {
  Edge, Node 
} from '@xyflow/react'

import {
  collectClusterBoundaries,
  collectEdgePaths,
  collectNodeBounds,
  parseTranslate,
  translatePathData,
  type GraphvizBoundary,
} from './architecture-evolution-layout-support'

export interface GraphvizLayoutResult<TNode extends Node = Node> {
  readonly nodes: readonly TNode[]
  readonly boundaries: readonly GraphvizBoundary[]
  readonly edgePathsById: ReadonlyMap<string, string>
}

interface ClusterDefinition {
  readonly id: string
  readonly label: string
  readonly kind: GraphvizBoundary['kind']
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
  return value.replaceAll('\\', '\\\\').replaceAll('"', '\\"')
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

    if (suffix === null) continue
    if (kind === 'service')
      servicesBySuffix.set(suffix, [...(servicesBySuffix.get(suffix) ?? []), node.id])
    if (kind === 'database')
      databasesBySuffix.set(suffix, [...(databasesBySuffix.get(suffix) ?? []), node.id])
  }

  return [...servicesBySuffix.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .flatMap(([suffix, serviceIds]) => {
      const databaseIds = databasesBySuffix.get(suffix) ?? []
      if (serviceIds.length === 0 || databaseIds.length === 0) return []

      return [
        {
          id: `cluster_slice_${suffix}`,
          label: `Orders Domain ${suffix.toUpperCase()}`,
          kind: 'slice' as const,
          nodeIds: [...serviceIds, ...databaseIds],
        },
      ]
    })
}

function renderNode(node: Node<Record<string, unknown>>, indent: string): string {
  const label = typeof node.data['label'] === 'string' ? node.data['label'] : node.id
  return `${indent}"${node.id}" [width=${NODE_WIDTH / PX_PER_INCH},height=${NODE_HEIGHT / PX_PER_INCH},fixedsize=true,id="${node.id}",label="${escapeDotLabel(label)}"]`
}

function createDot<TNode extends Node<Record<string, unknown>>>(
  nodes: readonly TNode[],
  edges: readonly Edge[],
): {
  readonly dot: string
  readonly clusters: readonly ClusterDefinition[]
} {
  const clusters = getClusterDefinitions(nodes)
  const lines = [
    'digraph {',
    '  compound=true',
    '  clusterrank=local',
    `  graph [splines=polyline,rankdir=TB,ranksep=${RANK_SEPARATION},nodesep=${NODE_SEPARATION},newrank=true]`,
    '  node [shape=box,fontsize=5]',
    '  edge [fontsize=5]',
  ]

  for (const cluster of clusters.filter((clusterItem) => clusterItem.kind === 'slice')) {
    lines.push(`  subgraph ${cluster.id} {`)
    lines.push(`    label="${cluster.label}"`)
    lines.push('    labelloc="b"')
    lines.push('    labeljust="l"')
    lines.push('    margin=20')

    for (const nodeId of cluster.nodeIds) {
      const node = nodes.find((candidate) => candidate.id === nodeId)
      if (node !== undefined) lines.push(renderNode(node, '    '))
    }

    lines.push('  }')
  }

  for (const node of nodes) {
    const kind = getNodeKind(node)
    if (kind === 'service' || kind === 'database') continue
    lines.push(renderNode(node, '  '))
  }

  const externalNodeIds = nodes
    .filter((node) => {
      const kind = getNodeKind(node)
      return kind !== 'service' && kind !== 'database'
    })
    .map((node) => node.id)

  if (externalNodeIds.length > 1) {
    const quotedExternalNodeIds = externalNodeIds.map((nodeId) => `"${nodeId}"`).join('; ')
    lines.push(`  { rank=same; ${quotedExternalNodeIds} }`)
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

export async function applyGraphvizLayout<TNode extends Node<Record<string, unknown>>>(
  nodes: readonly TNode[],
  edges: readonly Edge[],
): Promise<GraphvizLayoutResult<TNode>> {
  const {
    dot, clusters 
  } = createDot(nodes, edges)
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
  const clusterState = collectClusterBoundaries(svgDocument, clusterById, translation)
  const nodeState = collectNodeBounds(svgDocument, nodes, translation)
  const edgeState = collectEdgePaths(svgDocument, edges, translation)

  const allBounds = [clusterState.bounds, nodeState.bounds, edgeState.bounds]
  const minimumX = Math.min(...allBounds.map((bounds) => bounds.minX))
  const minimumY = Math.min(...allBounds.map((bounds) => bounds.minY))
  const deltaX = CANVAS_MARGIN - minimumX
  const deltaY = CANVAS_MARGIN - minimumY

  return {
    nodes: nodes.map((node) => {
      const bounds = nodeState.nodeBoundsById.get(node.id)
      if (bounds === undefined) return node

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
    boundaries: clusterState.boundaries.map((boundary) => ({
      ...boundary,
      x: boundary.x + deltaX,
      y: boundary.y + deltaY,
    })),
    edgePathsById: new Map(
      [...edgeState.edgePathsById.entries()].map(([edgeId, pathData]) => {
        return [edgeId, translatePathData(pathData, deltaX, deltaY)]
      }),
    ),
  }
}
