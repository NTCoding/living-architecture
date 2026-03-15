import type * as d3 from 'd3'
import { getLinkNodeId } from '../ForceGraph/GraphRenderingSetup'
import type {
  SimulationLink, SimulationNode, TooltipData 
} from '../graph-types'

export function setupClusteredNodeEvents(params: {
  readonly node: d3.Selection<SVGGElement, SimulationNode, SVGGElement, unknown>
  readonly links: readonly SimulationLink[]
  readonly onNodeClick: (nodeId: string) => void
  readonly onNodeHover: (data: TooltipData | null) => void
}): void {
  params.node.on('click', (event: PointerEvent, datum: SimulationNode) => {
    event.stopPropagation()
    params.onNodeClick(datum.id)
  })

  params.node.on('mouseenter', (event: MouseEvent, datum: SimulationNode) => {
    const incomingCount = params.links.filter(
      (linkDatum) => getLinkNodeId(linkDatum.target) === datum.id,
    ).length
    const outgoingCount = params.links.filter(
      (linkDatum) => getLinkNodeId(linkDatum.source) === datum.id,
    ).length

    params.onNodeHover({
      node: datum,
      x: event.pageX,
      y: event.pageY,
      incomingCount,
      outgoingCount,
    })
  })

  params.node.on('mouseleave', () => {
    params.onNodeHover(null)
  })
}
