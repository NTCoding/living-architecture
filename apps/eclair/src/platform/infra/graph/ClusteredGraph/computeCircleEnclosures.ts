import * as d3 from 'd3'
import type { NodeType } from '@/platform/domain/eclair-types'
import type { SimulationNode } from '../graph-types'
import { LayoutError } from '@/platform/infra/errors/errors'

export interface ClusterCircleDefinition {
  readonly id: string
  readonly domain: string
  readonly label: string
  readonly nodeIds: readonly string[]
}

export interface DomainCircle {
  readonly id: string
  readonly domain: string
  readonly label: string
  readonly x: number
  readonly y: number
  readonly r: number
  readonly nodeIds: readonly string[]
}

export interface PackedDomainCircle {
  readonly id: string
  readonly domain: string
  readonly label: string
  readonly r: number
  readonly nodeIds: readonly string[]
  readonly nodeOffsets: ReadonlyMap<string, {
    readonly x: number;
    readonly y: number 
  }>
}

export const CLUSTERED_NODE_LABEL_MAX_LENGTH = 18

const NODE_LAYOUT_PADDING = 26
const DOMAIN_CIRCLE_PADDING = 34
const MIN_DOMAIN_RADIUS = 88
const CLUSTERED_LABEL_HALF_CHAR_WIDTH = 2.85
const CLUSTERED_LABEL_HORIZONTAL_PADDING = 10
const CLUSTERED_LABEL_VERTICAL_EXTENT = 24

export function truncateClusteredNodeLabel(name: string): string {
  if (name.length <= CLUSTERED_NODE_LABEL_MAX_LENGTH) {
    return name
  }

  return `${name.slice(0, CLUSTERED_NODE_LABEL_MAX_LENGTH - 3)}...`
}

export function packDomainNodes(params: {
  readonly nodes: readonly SimulationNode[]
  readonly clusters: readonly ClusterCircleDefinition[]
  readonly getNodeRadius: (type: NodeType) => number
}): readonly PackedDomainCircle[] {
  return params.clusters.flatMap((cluster) => {
    const memberNodes = cluster.nodeIds
      .map((nodeId) => params.nodes.find((node) => node.id === nodeId))
      .filter((node): node is SimulationNode => node !== undefined)

    if (memberNodes.length === 0) {
      return []
    }

    const circles = memberNodes.map((node) => {
      const nodeRadius = params.getNodeRadius(node.type)
      const labelHalfWidth =
        truncateClusteredNodeLabel(node.name).length * CLUSTERED_LABEL_HALF_CHAR_WIDTH +
        CLUSTERED_LABEL_HORIZONTAL_PADDING

      return {
        id: node.id,
        x: 0,
        y: 0,
        r: Math.max(
          nodeRadius + NODE_LAYOUT_PADDING,
          labelHalfWidth,
          nodeRadius + CLUSTERED_LABEL_VERTICAL_EXTENT,
        ),
      }
    })

    d3.packSiblings(circles)
    const enclosure = d3.packEnclose(circles)

    if (
      !Number.isFinite(enclosure.x) ||
      !Number.isFinite(enclosure.y) ||
      !Number.isFinite(enclosure.r)
    ) {
      throw new LayoutError(`Unable to compute enclosure for domain '${cluster.domain}'`)
    }

    return [
      {
        id: cluster.id,
        domain: cluster.domain,
        label: cluster.label,
        r: Math.max(enclosure.r + DOMAIN_CIRCLE_PADDING, MIN_DOMAIN_RADIUS),
        nodeIds: cluster.nodeIds,
        nodeOffsets: new Map(
          circles.map((circle) => [
            circle.id,
            {
              x: circle.x - enclosure.x,
              y: circle.y - enclosure.y,
            },
          ]),
        ),
      },
    ]
  })
}
