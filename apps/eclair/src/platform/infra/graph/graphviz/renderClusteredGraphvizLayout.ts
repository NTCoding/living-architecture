import * as Viz from '@viz-js/viz'
import {
  LayoutError, RenderingError 
} from '@/platform/infra/errors/errors'

export interface ClusteredGraphvizNode {
  readonly id: string
  readonly label: string
  readonly widthPx: number
  readonly heightPx: number
}

export interface ClusteredGraphvizEdge {
  readonly source: string
  readonly target: string
}

export interface ClusteredGraphvizLayoutResult {
  readonly positions: ReadonlyMap<
    string,
    {
      readonly x: number
      readonly y: number
    }
  >
}

const vizInstancePromise = Viz.instance()
const PX_PER_INCH = 72
const NODE_SEPARATION = 1.25
const RANK_SEPARATION = 1.6
const CANVAS_MARGIN = 72

function escapeDotLabel(value: string): string {
  return value.replaceAll('\\', '\\\\').replaceAll('"', '\\"')
}

function createDomId(index: number): string {
  return `clustered-layout-node-${String(index)}`
}

function parseTranslate(transform: string | null): {
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

  if (match === null) {
    return {
      x: 0,
      y: 0,
    }
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
  const translatedPoints = Array.from({ length: polygon.points.numberOfItems }, (_, index) => {
    const point = polygon.points.getItem(index)

    return {
      x: point.x + translateX,
      y: point.y + translateY,
    }
  })

  const xValues = translatedPoints.map((point) => point.x)
  const yValues = translatedPoints.map((point) => point.y)
  const minX = Math.min(...xValues)
  const minY = Math.min(...yValues)
  const maxX = Math.max(...xValues)
  const maxY = Math.max(...yValues)

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  }
}

function createDot(
  nodes: readonly ClusteredGraphvizNode[],
  edges: readonly ClusteredGraphvizEdge[],
): {
  readonly dot: string
  readonly domIdsByNodeId: ReadonlyMap<string, string>
} {
  const domIdsByNodeId = new Map<string, string>()
  const lines = [
    'digraph {',
    `  graph [rankdir=LR,overlap=false,splines=false,pad=0.6,nodesep=${NODE_SEPARATION},ranksep=${RANK_SEPARATION}]`,
    '  node [shape=box,fixedsize=true,fontsize=10,margin=0]',
    '  edge [arrowhead=normal]',
  ]

  nodes.forEach((node, index) => {
    const domId = createDomId(index)
    domIdsByNodeId.set(node.id, domId)
    lines.push(
      `  "${escapeDotLabel(node.id)}" [id="${domId}",label="${escapeDotLabel(node.label)}",width=${node.widthPx / PX_PER_INCH},height=${node.heightPx / PX_PER_INCH}]`,
    )
  })

  for (const edge of edges) {
    lines.push(`  "${escapeDotLabel(edge.source)}" -> "${escapeDotLabel(edge.target)}"`)
  }

  lines.push('}')

  return {
    dot: lines.join('\n'),
    domIdsByNodeId,
  }
}

export async function renderClusteredGraphvizLayout(params: {
  readonly nodes: readonly ClusteredGraphvizNode[]
  readonly edges: readonly ClusteredGraphvizEdge[]
}): Promise<ClusteredGraphvizLayoutResult> {
  if (params.nodes.length === 0) {
    return {positions: new Map(),}
  }

  const viz = await vizInstancePromise
  const {
    dot, domIdsByNodeId 
  } = createDot(params.nodes, params.edges)
  const svgMarkup = viz.renderString(dot, {
    engine: 'dot',
    format: 'svg',
  })
  const svgDocument = new DOMParser().parseFromString(svgMarkup, 'image/svg+xml')
  const graphGroup = svgDocument.querySelector('svg > g.graph')

  if (!(graphGroup instanceof SVGGElement)) {
    throw new RenderingError('Graphviz output did not contain a graph group')
  }

  const translation = parseTranslate(graphGroup.getAttribute('transform'))
  const boundsEntries = params.nodes.map((node) => {
    const domId = domIdsByNodeId.get(node.id)

    if (domId === undefined) {
      throw new LayoutError(`Missing DOM id for clustered node '${node.id}'`)
    }

    const group = svgDocument.querySelector(`g[id="${domId}"]`)
    const polygon = group?.querySelector('polygon')

    if (!(polygon instanceof SVGPolygonElement)) {
      throw new LayoutError(`Graphviz output did not contain bounds for node '${node.id}'`)
    }

    return [node.id, parsePolygonBounds(polygon, translation.x, translation.y)] as const
  })
  const boundsById = new Map(boundsEntries)
  const minimumX = Math.min(...boundsEntries.map(([, bounds]) => bounds.x))
  const minimumY = Math.min(...boundsEntries.map(([, bounds]) => bounds.y))
  const deltaX = CANVAS_MARGIN - minimumX
  const deltaY = CANVAS_MARGIN - minimumY

  return {
    positions: new Map(
      [...boundsById.entries()].map(([nodeId, bounds]) => {
        return [
          nodeId,
          {
            x: bounds.x + bounds.width / 2 + deltaX,
            y: bounds.y + bounds.height / 2 + deltaY,
          },
        ]
      }),
    ),
  }
}
