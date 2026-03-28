import * as d3 from 'd3'
import { getLinkNodeId } from '../ForceGraph/GraphRenderingSetup'
import { getNodeRadius } from '../ForceGraph/VisualizationDataAdapters'
import type {
  SimulationLink, SimulationNode 
} from '../graph-types'
import type { DomainCircle } from './computeCircleEnclosures'
import { calculateCircleFocusTransform } from './clusteredGraphGeometry'

export function applyClusteredPresentation(params: {
  readonly svg: d3.Selection<SVGSVGElement, unknown, d3.BaseType, unknown>
  readonly zoom: d3.ZoomBehavior<SVGSVGElement, unknown>
  readonly node: d3.Selection<SVGGElement, SimulationNode, SVGGElement, unknown>
  readonly link: d3.Selection<SVGPathElement, SimulationLink, SVGGElement, unknown>
  readonly domainGroup: d3.Selection<SVGGElement, DomainCircle, SVGGElement, unknown>
  readonly nodes: readonly SimulationNode[]
  readonly circles: readonly DomainCircle[]
  readonly focusedDomain: string | null | undefined
  readonly width: number
  readonly height: number
  readonly shouldFitViewport: boolean
  readonly fitViewport: (
    svg: d3.Selection<SVGSVGElement, unknown, d3.BaseType, unknown>,
    zoom: d3.ZoomBehavior<SVGSVGElement, unknown>,
    nodes: readonly SimulationNode[],
    circles: readonly DomainCircle[],
  ) => void
}): void {
  if (params.focusedDomain !== null && params.focusedDomain !== undefined) {
    const focusedCircle = params.circles.find((circle) => circle.domain === params.focusedDomain)

    params.node
      .selectAll<SVGCircleElement, SimulationNode>('.node-circle')
      .transition()
      .duration(350)
      .attr('opacity', (datum) => (datum.domain === params.focusedDomain ? 1 : 0.18))
      .attr('stroke-width', (datum) => (datum.domain === params.focusedDomain ? 3.2 : 1.5))
      .attr(
        'r',
        (datum) => getNodeRadius(datum.type) * (datum.domain === params.focusedDomain ? 1.18 : 0.9),
      )

    params.node
      .selectAll<SVGTextElement, SimulationNode>('.node-label')
      .transition()
      .duration(350)
      .attr('opacity', (datum) => (datum.domain === params.focusedDomain ? 1 : 0.2))

    params.node
      .selectAll<SVGTextElement, SimulationNode>('.node-domain-label')
      .transition()
      .duration(350)
      .attr('opacity', 0)

    params.link
      .transition()
      .duration(350)
      .attr('opacity', (datum) => {
        const sourceNode = params.nodes.find(
          (nodeDatum) => nodeDatum.id === getLinkNodeId(datum.source),
        )
        const targetNode = params.nodes.find(
          (nodeDatum) => nodeDatum.id === getLinkNodeId(datum.target),
        )
        const touchesFocusedDomain =
          sourceNode?.domain === params.focusedDomain || targetNode?.domain === params.focusedDomain

        return touchesFocusedDomain ? 0.82 : 0.08
      })
      .attr('stroke-width', (datum) => {
        const sourceNode = params.nodes.find(
          (nodeDatum) => nodeDatum.id === getLinkNodeId(datum.source),
        )
        const targetNode = params.nodes.find(
          (nodeDatum) => nodeDatum.id === getLinkNodeId(datum.target),
        )
        const withinFocusedDomain =
          sourceNode?.domain === params.focusedDomain && targetNode?.domain === params.focusedDomain

        return withinFocusedDomain ? 2.8 : 1.4
      })

    params.domainGroup
      .selectAll<SVGCircleElement, DomainCircle>('circle')
      .transition()
      .duration(350)
      .attr('opacity', (datum) => (datum.domain === params.focusedDomain ? 1 : 0.28))
      .attr('stroke-width', (datum) => (datum.domain === params.focusedDomain ? 3.5 : 1.6))

    params.domainGroup
      .selectAll<SVGTextElement, DomainCircle>('text')
      .transition()
      .duration(350)
      .attr('opacity', (datum) => (datum.domain === params.focusedDomain ? 1 : 0.3))

    if (focusedCircle !== undefined) {
      const transform = calculateCircleFocusTransform({
        circle: focusedCircle,
        width: params.width,
        height: params.height,
      })

      params.svg
        .transition()
        .duration(450)
        .call(
          params.zoom.transform,
          d3.zoomIdentity
            .translate(transform.translateX, transform.translateY)
            .scale(transform.scale),
        )
    }

    return
  }

  params.node
    .selectAll<SVGCircleElement, SimulationNode>('.node-circle')
    .transition()
    .duration(300)
    .attr('opacity', 1)
    .attr('stroke-width', 2)
    .attr('stroke', 'rgba(255, 255, 255, 0.3)')
    .attr('r', (datum) => getNodeRadius(datum.type))

  params.node
    .selectAll<SVGTextElement, SimulationNode>('.node-label')
    .transition()
    .duration(300)
    .attr('opacity', 1)

  params.node
    .selectAll<SVGTextElement, SimulationNode>('.node-domain-label')
    .transition()
    .duration(300)
    .attr('opacity', 0)

  params.link.transition().duration(300).attr('opacity', 0.6).attr('stroke-width', 2)

  params.domainGroup
    .selectAll<SVGCircleElement, DomainCircle>('circle')
    .transition()
    .duration(300)
    .attr('opacity', 1)
    .attr('stroke-width', 2)

  params.domainGroup
    .selectAll<SVGTextElement, DomainCircle>('text')
    .transition()
    .duration(300)
    .attr('opacity', 1)

  if (
    params.shouldFitViewport &&
    params.nodes.length > 0 &&
    params.width > 0 &&
    params.height > 0
  ) {
    params.fitViewport(params.svg, params.zoom, params.nodes, params.circles)
  }
}
