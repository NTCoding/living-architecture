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

const NODE_FOOTPRINT_PADDING = 30
const DOMAIN_CIRCLE_PADDING = 34

export function computeCircleEnclosures(params: {
  readonly nodes: readonly SimulationNode[]
  readonly clusters: readonly ClusterCircleDefinition[]
  readonly getNodeRadius: (type: NodeType) => number
}): readonly DomainCircle[] {
  return params.clusters.flatMap((cluster) => {
    const memberNodes = cluster.nodeIds
      .map((nodeId) => params.nodes.find((node) => node.id === nodeId))
      .filter((node): node is SimulationNode => node !== undefined)

    if (memberNodes.length === 0) {
      return []
    }

    const circles = memberNodes.map((node) => {
      if (node.x === undefined || node.y === undefined) {
        throw new LayoutError(`Node ${node.id} missing coordinates for clustered circle enclosure`)
      }

      return {
        x: node.x,
        y: node.y,
        r: params.getNodeRadius(node.type) + NODE_FOOTPRINT_PADDING,
      }
    })

    const enclosure = d3.packEnclose(circles)
    return [
      {
        id: cluster.id,
        domain: cluster.domain,
        label: cluster.label,
        x: enclosure.x,
        y: enclosure.y,
        r: enclosure.r + DOMAIN_CIRCLE_PADDING,
        nodeIds: cluster.nodeIds,
      },
    ]
  })
}
