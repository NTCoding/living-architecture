import {
  useCallback, useEffect, useMemo, useRef, useState 
} from 'react'
import * as d3 from 'd3'
import type { Edge } from '@/platform/domain/eclair-types'
import { compareByCodePoint } from '@/platform/domain/compare-by-code-point'
import type { Theme } from '@/types/theme'
import type {
  SimulationLink, SimulationNode, TooltipData 
} from '../graph-types'
import {
  truncateClusteredNodeLabel, type DomainCircle 
} from './computeCircleEnclosures'
import { applyClusteredPresentation } from './applyClusteredPresentation'
import {
  calculateCircleFocusTransform,
  calculateViewportTransform,
  CLUSTER_LABEL_STROKE_WIDTH,
  getClusterLabelFontSize,
  getClusterLabelY,
} from './clusteredGraphGeometry'
import { setupClusteredNodeEvents } from './setupClusteredNodeEvents'
import {
  updateHighlight,
  setupSVGFiltersAndMarkers,
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

    const initialBounds = containerRef.current.getBoundingClientRect()
    setDimensions({
      width: initialBounds.width,
      height: initialBounds.height,
    })

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
      truncateName: (name) => truncateClusteredNodeLabel(name),
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

    setupClusteredNodeEvents({
      node,
      links: layout.links,
      onNodeClick: handleNodeClick,
      onNodeHover: handleNodeHover,
    })

    applyNodePositions()

    node
      .selectAll<SVGTextElement, SimulationNode>('.node-label')
      .attr('font-size', '10px')
      .attr('dy', (datum) => getNodeRadius(datum.type) + 13)

    node.selectAll<SVGTextElement, SimulationNode>('.node-domain-label').attr('opacity', 0)

    const zoom = setupZoomBehavior(svg, g, { onInteractionStart: () => handleNodeHover(null) })

    nodeSelectionRef.current = node
    linkSelectionRef.current = link
    zoomRef.current = zoom
    nodesRef.current = layout.nodes
    circlesRef.current = layout.circles

    applyClusteredPresentation({
      svg,
      zoom,
      node,
      link,
      domainGroup: domains,
      nodes: layout.nodes,
      circles: layout.circles,
      focusedDomain,
      width: dimensions.width,
      height: dimensions.height,
      shouldFitViewport: isGraphDataChange,
      fitViewport,
    })
    svg.on('click', handleBackgroundClick)
  }, [
    currentGraphKey,
    dimensions,
    fitViewport,
    focusedDomain,
    handleBackgroundClick,
    handleNodeClick,
    handleNodeHover,
    layout,
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
