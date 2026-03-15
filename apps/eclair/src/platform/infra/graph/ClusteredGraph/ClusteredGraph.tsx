import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as d3 from 'd3'
import type { Edge } from '@/platform/domain/eclair-types'
import { compareByCodePoint } from '@/platform/domain/compare-by-code-point'
import type { Theme } from '@/types/theme'
import type { SimulationLink, SimulationNode, TooltipData } from '../graph-types'
import { truncateClusteredNodeLabel, type DomainCircle } from './computeCircleEnclosures'
import {
  updateHighlight,
  setupSVGFiltersAndMarkers,
  getLinkNodeId,
  setupLinks,
  setupNodes,
  createUpdatePositionsFunction,
  setupZoomBehavior,
} from '../ForceGraph/GraphRenderingSetup'
import {
  getNodeColor,
  getNodeRadius,
  getSemanticEdgeType,
  getSemanticEdgeColor,
  isAsyncEdge,
  getDomainColor,
} from '../ForceGraph/VisualizationDataAdapters'

interface ClusteredGraphLayoutData {
  readonly nodes: readonly SimulationNode[]
  readonly links: readonly SimulationLink[]
  readonly circles: readonly DomainCircle[]
  readonly uniqueDomains: readonly string[]
}

const CLUSTER_LABEL_MIN_FONT_SIZE = 60
const CLUSTER_LABEL_MAX_FONT_SIZE = 84
const CLUSTER_LABEL_GAP = 20
const CLUSTER_LABEL_STROKE_WIDTH = 14

function getClusterLabelFontSize(circle: DomainCircle): number {
  return Math.max(
    CLUSTER_LABEL_MIN_FONT_SIZE,
    Math.min(CLUSTER_LABEL_MAX_FONT_SIZE, circle.r * 0.42),
  )
}

function getClusterLabelY(circle: DomainCircle): number {
  return circle.y - circle.r - CLUSTER_LABEL_GAP
}

function getClusterLabelTop(circle: DomainCircle): number {
  return getClusterLabelY(circle) - getClusterLabelFontSize(circle)
}

interface ClusteredGraphProps {
  readonly layout: ClusteredGraphLayoutData | null
  readonly theme: Theme
  readonly highlightedNodeIds?: Set<string> | undefined
  readonly highlightedNodeId?: string | null
  readonly focusedDomain?: string | null
  readonly onNodeClick?: (nodeId: string) => void
  readonly onNodeHover?: (data: TooltipData | null) => void
  readonly onBackgroundClick?: () => void
}

function withOpacity(color: string, opacity: number): string {
  const parsed = d3.color(color)
  if (parsed === null) {
    return color
  }

  parsed.opacity = opacity
  return parsed.formatRgb()
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
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  for (const circle of circles) {
    minX = Math.min(minX, circle.x - circle.r)
    minY = Math.min(minY, getClusterLabelTop(circle) - 12)
    maxX = Math.max(maxX, circle.x + circle.r)
    maxY = Math.max(maxY, circle.y + circle.r)
  }

  for (const node of nodes) {
    if (node.x === undefined || node.y === undefined) {
      continue
    }

    const radius = getNodeRadius(node.type) + 32
    minX = Math.min(minX, node.x - radius)
    minY = Math.min(minY, node.y - radius)
    maxX = Math.max(maxX, node.x + radius)
    maxY = Math.max(maxY, node.y + radius + 22)
  }

  if (
    !Number.isFinite(minX) ||
    !Number.isFinite(minY) ||
    !Number.isFinite(maxX) ||
    !Number.isFinite(maxY)
  ) {
    return {
      minX: 0,
      minY: 0,
      maxX: 0,
      maxY: 0,
    }
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
  }
}

function calculateViewportTransform(params: {
  readonly nodes: readonly SimulationNode[]
  readonly circles: readonly DomainCircle[]
  readonly width: number
  readonly height: number
  readonly padding: number
}): { readonly translateX: number; readonly translateY: number; readonly scale: number } {
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

function calculateCircleFocusTransform(params: {
  readonly circle: DomainCircle
  readonly width: number
  readonly height: number
}): { readonly translateX: number; readonly translateY: number; readonly scale: number } {
  const focusDiameter = params.circle.r * 2 + 180
  const scale = Math.min(params.width / focusDiameter, params.height / focusDiameter, 2.2)

  return {
    translateX: params.width / 2 - params.circle.x * scale,
    translateY: params.height / 2 - params.circle.y * scale,
    scale,
  }
}

export function ClusteredGraph({
  layout,
  theme,
  highlightedNodeIds,
  highlightedNodeId,
  focusedDomain,
  onNodeClick,
  onNodeHover,
  onBackgroundClick,
}: Readonly<ClusteredGraphProps>): React.ReactElement {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  const nodeSelectionRef = useRef<d3.Selection<
    SVGGElement,
    SimulationNode,
    SVGGElement,
    unknown
  > | null>(null)
  const linkSelectionRef = useRef<d3.Selection<
    SVGPathElement,
    SimulationLink,
    SVGGElement,
    unknown
  > | null>(null)
  const nodesRef = useRef<readonly SimulationNode[]>([])
  const circlesRef = useRef<readonly DomainCircle[]>([])
  const wasHighlightedRef = useRef(false)
  const lastGraphKeyRef = useRef('')
  const onNodeHoverRef = useRef(onNodeHover)
  onNodeHoverRef.current = onNodeHover

  const [dimensions, setDimensions] = useState({
    width: 0,
    height: 0,
  })

  const allEdgesForTracing: Edge[] = useMemo(() => {
    return layout === null ? [] : layout.links.map((link) => link.originalEdge)
  }, [layout])

  const currentGraphKey = useMemo(() => {
    if (layout === null) {
      return ''
    }

    const nodeKey = layout.nodes
      .map((node) => node.id)
      .sort(compareByCodePoint)
      .join(',')
    const edgeKey = layout.links
      .map((link) => {
        return `${link.originalEdge.source}->${link.originalEdge.target}:${link.originalEdge.type ?? 'default'}`
      })
      .sort(compareByCodePoint)
      .join(',')

    return `${nodeKey}|${edgeKey}`
  }, [layout])

  useEffect(() => {
    if (!containerRef.current) {
      return
    }

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry !== undefined) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        })
      }
    })

    resizeObserver.observe(containerRef.current)
    return () => resizeObserver.disconnect()
  }, [])

  const handleNodeClick = useCallback(
    (nodeId: string) => {
      onNodeClick?.(nodeId)
    },
    [onNodeClick],
  )

  const handleNodeHover = useCallback((data: TooltipData | null) => {
    onNodeHoverRef.current?.(data)
  }, [])

  const handleBackgroundClick = useCallback(() => {
    onBackgroundClick?.()
  }, [onBackgroundClick])

  const fitViewport = useCallback(
    (
      svg: d3.Selection<SVGSVGElement, unknown, d3.BaseType, unknown>,
      zoom: d3.ZoomBehavior<SVGSVGElement, unknown>,
      nodes: readonly SimulationNode[],
      circles: readonly DomainCircle[],
    ) => {
      const transform = calculateViewportTransform({
        nodes,
        circles,
        width: dimensions.width,
        height: dimensions.height,
        padding: 80,
      })

      svg.call(
        zoom.transform,
        d3.zoomIdentity
          .translate(transform.translateX, transform.translateY)
          .scale(transform.scale),
      )
    },
    [dimensions],
  )

  const applyPresentation = useCallback(
    (
      svg: d3.Selection<SVGSVGElement, unknown, d3.BaseType, unknown>,
      zoom: d3.ZoomBehavior<SVGSVGElement, unknown>,
      node: d3.Selection<SVGGElement, SimulationNode, SVGGElement, unknown>,
      link: d3.Selection<SVGPathElement, SimulationLink, SVGGElement, unknown>,
      domainGroup: d3.Selection<SVGGElement, DomainCircle, SVGGElement, unknown>,
      nodes: readonly SimulationNode[],
      circles: readonly DomainCircle[],
      shouldFitViewport: boolean,
    ) => {
      if (focusedDomain !== null && focusedDomain !== undefined) {
        const focusedCircle = circles.find((circle) => circle.domain === focusedDomain)

        node
          .selectAll<SVGCircleElement, SimulationNode>('.node-circle')
          .transition()
          .duration(350)
          .attr('opacity', (datum) => (datum.domain === focusedDomain ? 1 : 0.18))
          .attr('stroke-width', (datum) => (datum.domain === focusedDomain ? 3.2 : 1.5))
          .attr(
            'r',
            (datum) => getNodeRadius(datum.type) * (datum.domain === focusedDomain ? 1.18 : 0.9),
          )

        node
          .selectAll<SVGTextElement, SimulationNode>('.node-label')
          .transition()
          .duration(350)
          .attr('opacity', (datum) => (datum.domain === focusedDomain ? 1 : 0.2))

        node
          .selectAll<SVGTextElement, SimulationNode>('.node-domain-label')
          .transition()
          .duration(350)
          .attr('opacity', 0)

        link
          .transition()
          .duration(350)
          .attr('opacity', (datum) => {
            const sourceNode = nodes.find(
              (nodeDatum) => nodeDatum.id === getLinkNodeId(datum.source),
            )
            const targetNode = nodes.find(
              (nodeDatum) => nodeDatum.id === getLinkNodeId(datum.target),
            )
            const touchesFocusedDomain =
              sourceNode?.domain === focusedDomain || targetNode?.domain === focusedDomain
            return touchesFocusedDomain ? 0.82 : 0.08
          })
          .attr('stroke-width', (datum) => {
            const sourceNode = nodes.find(
              (nodeDatum) => nodeDatum.id === getLinkNodeId(datum.source),
            )
            const targetNode = nodes.find(
              (nodeDatum) => nodeDatum.id === getLinkNodeId(datum.target),
            )
            const withinFocusedDomain =
              sourceNode?.domain === focusedDomain && targetNode?.domain === focusedDomain
            return withinFocusedDomain ? 2.8 : 1.4
          })

        domainGroup
          .selectAll<SVGCircleElement, DomainCircle>('circle')
          .transition()
          .duration(350)
          .attr('opacity', (datum) => (datum.domain === focusedDomain ? 1 : 0.28))
          .attr('stroke-width', (datum) => (datum.domain === focusedDomain ? 3.5 : 1.6))

        domainGroup
          .selectAll<SVGTextElement, DomainCircle>('text')
          .transition()
          .duration(350)
          .attr('opacity', (datum) => (datum.domain === focusedDomain ? 1 : 0.3))

        if (focusedCircle !== undefined) {
          const transform = calculateCircleFocusTransform({
            circle: focusedCircle,
            width: dimensions.width,
            height: dimensions.height,
          })

          svg
            .transition()
            .duration(450)
            .call(
              zoom.transform,
              d3.zoomIdentity
                .translate(transform.translateX, transform.translateY)
                .scale(transform.scale),
            )
        }

        return
      }

      node
        .selectAll<SVGCircleElement, SimulationNode>('.node-circle')
        .transition()
        .duration(300)
        .attr('opacity', 1)
        .attr('stroke-width', 2)
        .attr('stroke', 'rgba(255, 255, 255, 0.3)')
        .attr('r', (datum) => getNodeRadius(datum.type))

      node
        .selectAll<SVGTextElement, SimulationNode>('.node-label')
        .transition()
        .duration(300)
        .attr('opacity', 1)

      node
        .selectAll<SVGTextElement, SimulationNode>('.node-domain-label')
        .transition()
        .duration(300)
        .attr('opacity', 0)

      link.transition().duration(300).attr('opacity', 0.6).attr('stroke-width', 2)

      domainGroup
        .selectAll<SVGCircleElement, DomainCircle>('circle')
        .transition()
        .duration(300)
        .attr('opacity', 1)
        .attr('stroke-width', 2)

      domainGroup
        .selectAll<SVGTextElement, DomainCircle>('text')
        .transition()
        .duration(300)
        .attr('opacity', 1)

      if (shouldFitViewport && nodes.length > 0 && dimensions.width > 0 && dimensions.height > 0) {
        fitViewport(svg, zoom, nodes, circles)
      }
    },
    [dimensions, fitViewport, focusedDomain],
  )

  const setupNodeEvents = useCallback(
    (
      node: d3.Selection<SVGGElement, SimulationNode, SVGGElement, unknown>,
      links: readonly SimulationLink[],
    ) => {
      node.on('click', (event: PointerEvent, datum: SimulationNode) => {
        event.stopPropagation()
        handleNodeClick(datum.id)
      })

      node.on('mouseenter', (event: MouseEvent, datum: SimulationNode) => {
        const incomingCount = links.filter(
          (linkDatum) => getLinkNodeId(linkDatum.target) === datum.id,
        ).length
        const outgoingCount = links.filter(
          (linkDatum) => getLinkNodeId(linkDatum.source) === datum.id,
        ).length

        handleNodeHover({
          node: datum,
          x: event.pageX,
          y: event.pageY,
          incomingCount,
          outgoingCount,
        })
      })

      node.on('mouseleave', () => {
        handleNodeHover(null)
      })
    },
    [handleNodeClick, handleNodeHover],
  )

  useEffect(() => {
    if (!svgRef.current || layout === null || dimensions.width === 0 || dimensions.height === 0) {
      return
    }

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const currentKey = currentGraphKey
    const isGraphDataChange = currentKey !== lastGraphKeyRef.current
    lastGraphKeyRef.current = currentKey

    const g = svg.append('g').attr('class', 'graph-container')
    const defs = svg.append('defs')
    setupSVGFiltersAndMarkers(defs, theme)

    const domainGroup = g.append('g').attr('class', 'clustered-domains')
    const linkGroup = g.append('g').attr('class', 'links')
    const nodeGroup = g.append('g').attr('class', 'nodes')
    const nodeMap = new Map(layout.nodes.map((node) => [node.id, node]))

    const uniqueDomains = layout.uniqueDomains.length > 0 ? [...layout.uniqueDomains] : ['external']

    const domains = domainGroup
      .selectAll<SVGGElement, DomainCircle>('g')
      .data(layout.circles)
      .join('g')
      .attr('class', 'clustered-domain')
      .attr('pointer-events', 'none')

    domains
      .append('circle')
      .attr('cx', (datum) => datum.x)
      .attr('cy', (datum) => datum.y)
      .attr('r', (datum) => datum.r)
      .attr('fill', (datum) =>
        withOpacity(
          getDomainColor(datum.domain, uniqueDomains),
          theme === 'voltage' ? 0.05 : 0.035,
        ),
      )
      .attr('stroke', (datum) =>
        withOpacity(getDomainColor(datum.domain, uniqueDomains), theme === 'voltage' ? 0.45 : 0.35),
      )
      .attr('stroke-width', 1.5)

    domains
      .append('text')
      .attr('x', (datum) => datum.x)
      .attr('y', (datum) => getClusterLabelY(datum))
      .attr('text-anchor', 'middle')
      .attr('font-size', (datum) => `${String(getClusterLabelFontSize(datum))}px`)
      .attr('font-weight', 800)
      .attr('fill', 'var(--text-primary)')
      .attr('paint-order', 'stroke fill')
      .attr('stroke', theme === 'voltage' ? '#0a0a0f' : 'rgba(255, 255, 255, 0.96)')
      .attr('stroke-width', CLUSTER_LABEL_STROKE_WIDTH)
      .attr('stroke-linejoin', 'round')
      .text((datum) => datum.label)

    const link = setupLinks({
      linkGroup,
      links: [...layout.links],
      theme,
      nodeMap,
      getSemanticEdgeType,
      getSemanticEdgeColor,
      isAsyncEdge,
    })

    const node = setupNodes({
      nodeGroup,
      nodes: [...layout.nodes],
      theme,
      getNodeColor,
      getNodeRadius,
      getDomainColor,
      uniqueDomains,
      truncateName: (_name, _maxLength) => truncateClusteredNodeLabel(_name),
    })

    const applyNodePositions = createUpdatePositionsFunction({
      link,
      node,
      nodePositionMap: nodeMap,
      getNodeRadius,
    })

    node.call(
      d3
        .drag<SVGGElement, SimulationNode>()
        .on(
          'start',
          (
            _event: d3.D3DragEvent<SVGGElement, SimulationNode, SimulationNode>,
            datum: SimulationNode,
          ) => {
            handleNodeHover(null)
            datum.fx = datum.x
            datum.fy = datum.y
          },
        )
        .on(
          'drag',
          (
            event: d3.D3DragEvent<SVGGElement, SimulationNode, SimulationNode>,
            datum: SimulationNode,
          ) => {
            datum.x = event.x
            datum.y = event.y
            datum.fx = event.x
            datum.fy = event.y
            applyNodePositions()
          },
        )
        .on(
          'end',
          (
            _event: d3.D3DragEvent<SVGGElement, SimulationNode, SimulationNode>,
            datum: SimulationNode,
          ) => {
            datum.fx = null
            datum.fy = null
          },
        ),
    )

    setupNodeEvents(node, layout.links)

    applyNodePositions()

    node
      .selectAll<SVGTextElement, SimulationNode>('.node-label')
      .attr('font-size', '10px')
      .attr('dy', (datum) => getNodeRadius(datum.type) + 13)

    node.selectAll<SVGTextElement, SimulationNode>('.node-domain-label').attr('opacity', 0)

    const zoom = setupZoomBehavior(svg, g, {
      onInteractionStart: () => handleNodeHover(null),
    })

    nodeSelectionRef.current = node
    linkSelectionRef.current = link
    zoomRef.current = zoom
    nodesRef.current = layout.nodes
    circlesRef.current = layout.circles

    applyPresentation(
      svg,
      zoom,
      node,
      link,
      domains,
      layout.nodes,
      layout.circles,
      isGraphDataChange,
    )
    svg.on('click', handleBackgroundClick)
  }, [
    applyPresentation,
    currentGraphKey,
    dimensions,
    handleBackgroundClick,
    handleNodeHover,
    layout,
    setupNodeEvents,
    theme,
  ])

  useEffect(() => {
    const node = nodeSelectionRef.current
    const link = linkSelectionRef.current
    if (node === null || link === null) {
      return
    }

    const isHighlighted = highlightedNodeIds !== undefined && highlightedNodeIds.size > 0
    const wasHighlighted = wasHighlightedRef.current
    const highlightCleared = wasHighlighted && !isHighlighted

    updateHighlight({
      node,
      link,
      filteredEdges: allEdgesForTracing,
      highlightedNodeIds,
    })
    wasHighlightedRef.current = isHighlighted

    if (!highlightCleared || svgRef.current === null || zoomRef.current === null) {
      return
    }

    const svg = d3.select(svgRef.current)
    const focusedCircle = circlesRef.current.find((circle) => circle.domain === focusedDomain)

    if (focusedCircle !== undefined && focusedDomain !== null && focusedDomain !== undefined) {
      const transform = calculateCircleFocusTransform({
        circle: focusedCircle,
        width: dimensions.width,
        height: dimensions.height,
      })

      svg.call(
        zoomRef.current.transform,
        d3.zoomIdentity
          .translate(transform.translateX, transform.translateY)
          .scale(transform.scale),
      )
      return
    }

    fitViewport(svg, zoomRef.current, nodesRef.current, circlesRef.current)
  }, [allEdgesForTracing, dimensions, fitViewport, focusedDomain, highlightedNodeIds])

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden rounded-lg"
      data-testid="clustered-graph-container"
      data-highlighted-node={highlightedNodeId}
    >
      <div className="canvas-background absolute inset-0" />
      {layout === null && (
        <div className="floating-panel absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 px-5 py-4 text-sm font-medium text-[var(--text-secondary)]">
          Arranging domain clusters...
        </div>
      )}
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="relative z-10"
        data-testid="clustered-graph-svg"
      />
    </div>
  )
}
