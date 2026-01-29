import {
  useEffect, useRef, useCallback, useState, useMemo 
} from 'react'
import * as d3 from 'd3'
import type { RiviereGraph } from '@living-architecture/riviere-schema'
import type { Edge } from '@/platform/domain/eclair-types'
import { compareByCodePoint } from '@/platform/domain/compare-by-code-point'
import type { Theme } from '@/types/theme'
import type {
  SimulationNode, SimulationLink, TooltipData 
} from '../../types'
import { computeDagreLayout } from './computeDagreLayout'
import {
  updateHighlight,
  setupSVGFiltersAndMarkers,
  getLinkNodeId,
  calculateFitViewportTransform,
  setupLinks,
  setupNodes,
  createUpdatePositionsFunction,
  applyDagrePositions,
  setupZoomBehavior,
} from './GraphRenderingSetup'
import {
  applyFocusMode, applyResetMode 
} from './applyFocusModeBehavior'
import {
  createSimulationNodes,
  createSimulationLinks,
  createExternalNodes,
  createExternalLinks,
  createLayoutEdges,
  getNodeColor,
  getNodeRadius,
  getSemanticEdgeType,
  getSemanticEdgeColor,
  isAsyncEdge,
  truncateName,
  getDomainColor,
} from './VisualizationDataAdapters'

interface ForceGraphProps {
  readonly graph: RiviereGraph
  readonly theme: Theme
  readonly highlightedNodeIds?: Set<string> | undefined
  readonly highlightedNodeId?: string | null
  readonly visibleNodeIds?: Set<string> | undefined
  readonly focusedDomain?: string | null
  readonly onNodeClick?: (nodeId: string) => void
  readonly onNodeHover?: (data: TooltipData | null) => void
  readonly onBackgroundClick?: () => void
}

export function ForceGraph({
  graph,
  theme,
  highlightedNodeIds,
  highlightedNodeId,
  visibleNodeIds,
  focusedDomain,
  onNodeClick,
  onNodeHover,
  onBackgroundClick,
}: Readonly<ForceGraphProps>): React.ReactElement {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({
    width: 0,
    height: 0,
  })
  const lastGraphKeyRef = useRef<string>('')
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
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  const nodesRef = useRef<SimulationNode[]>([])
  const wasHighlightedRef = useRef(false)
  const onNodeHoverRef = useRef(onNodeHover)
  onNodeHoverRef.current = onNodeHover

  const filteredNodes = visibleNodeIds
    ? graph.components.filter((n) => visibleNodeIds.has(n.id))
    : graph.components

  const filteredEdges = visibleNodeIds
    ? graph.links.filter((e) => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target))
    : graph.links

  const allEdgesForTracing: Edge[] = useMemo(
    () => [
      ...filteredEdges,
      ...(graph.externalLinks ?? []).map((link) => ({
        source: link.source,
        target: `external:${link.target.name}`,
        type: link.type,
      })),
    ],
    [filteredEdges, graph.externalLinks],
  )

  useEffect(() => {
    if (!containerRef.current) return

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) {
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

  const fitViewportFn = useCallback(
    (
      svg: d3.Selection<SVGSVGElement, unknown, d3.BaseType, unknown>,
      zoom: d3.ZoomBehavior<SVGSVGElement, unknown>,
      nodes: SimulationNode[],
    ) => {
      const {
        translateX, translateY, scale 
      } = calculateFitViewportTransform({
        nodes,
        dimensions,
        padding: 80,
      })

      svg.call(zoom.transform, d3.zoomIdentity.translate(translateX, translateY).scale(scale))
    },
    [dimensions],
  )

  const applyVisualization = useCallback(
    (
      node: d3.Selection<SVGGElement, SimulationNode, SVGGElement, unknown>,
      link: d3.Selection<SVGPathElement, SimulationLink, SVGGElement, unknown>,
      zoom: d3.ZoomBehavior<SVGSVGElement, unknown>,
      svg: d3.Selection<SVGSVGElement, unknown, d3.BaseType, unknown>,
      nodes: SimulationNode[],
      domain: string | null | undefined,
      highlightIds: Set<string> | undefined,
      shouldFitViewport: boolean,
    ) => {
      if (domain) {
        applyFocusMode({
          svg,
          node,
          link,
          zoom,
          nodes,
          domain,
          theme,
          dimensions,
        })
        return
      }
      if (highlightIds) {
        return
      }
      applyResetMode({
        node,
        link,
      })
      if (shouldFitViewport && nodes.length > 0 && dimensions.width > 0 && dimensions.height > 0) {
        fitViewportFn(svg, zoom, nodes)
      }
    },
    [fitViewportFn, dimensions, theme],
  )

  const setupNodeEvents = useCallback(
    (
      node: d3.Selection<SVGGElement, SimulationNode, SVGGElement, unknown>,
      links: SimulationLink[],
    ) => {
      node.on('click', (event: PointerEvent, d: SimulationNode) => {
        event.stopPropagation()
        handleNodeClick(d.id)
      })
      node.on('mouseenter', (event: MouseEvent, d: SimulationNode) => {
        const incomingCount = links.filter((l) => getLinkNodeId(l.target) === d.id).length
        const outgoingCount = links.filter((l) => getLinkNodeId(l.source) === d.id).length
        handleNodeHover({
          node: d,
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
    if (!svgRef.current || dimensions.width === 0 || dimensions.height === 0) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const regularNodes = createSimulationNodes(filteredNodes)
    const regularLinks = createSimulationLinks(filteredEdges)
    const externalNodes = createExternalNodes(graph.externalLinks)
    const externalSimLinks = createExternalLinks(graph.externalLinks)
    const nodes = [...regularNodes, ...externalNodes]
    const links = [...regularLinks, ...externalSimLinks]

    const currentGraphKey = filteredNodes
      .map((n) => n.id)
      .sort(compareByCodePoint)
      .join(',')
    const isGraphDataChange = currentGraphKey !== lastGraphKeyRef.current
    lastGraphKeyRef.current = currentGraphKey

    const uniqueDomains = [...new Set(nodes.map((n) => n.domain))]
    const edgesForLayout = createLayoutEdges(filteredEdges, graph.externalLinks)

    const positions = computeDagreLayout({
      nodes,
      edges: edgesForLayout,
    })
    applyDagrePositions({
      nodes,
      positions,
    })

    const g = svg.append('g').attr('class', 'graph-container')

    const defs = svg.append('defs')
    setupSVGFiltersAndMarkers(defs, theme)

    const linkGroup = g.append('g').attr('class', 'links')
    const nodeGroup = g.append('g').attr('class', 'nodes')

    const nodeMap = new Map<string, SimulationNode>()
    for (const n of nodes) {
      nodeMap.set(n.id, n)
    }

    const link = setupLinks({
      linkGroup,
      links,
      theme,
      nodeMap,
      getSemanticEdgeType,
      getSemanticEdgeColor,
      isAsyncEdge,
    })

    const node = setupNodes({
      nodeGroup,
      nodes,
      theme,
      getNodeColor,
      getNodeRadius,
      getDomainColor,
      uniqueDomains,
      truncateName,
    }).call(
      d3
        .drag<SVGGElement, SimulationNode>()
        .on(
          'start',
          (
            _event: d3.D3DragEvent<SVGGElement, SimulationNode, SimulationNode>,
            d: SimulationNode,
          ) => {
            handleNodeHover(null)
            d.fx = d.x
            d.fy = d.y
          },
        )
        .on(
          'drag',
          (
            event: d3.D3DragEvent<SVGGElement, SimulationNode, SimulationNode>,
            d: SimulationNode,
          ) => {
            d.x = event.x
            d.y = event.y
            d.fx = event.x
            d.fy = event.y
            updatePositions()
          },
        )
        .on(
          'end',
          (
            _event: d3.D3DragEvent<SVGGElement, SimulationNode, SimulationNode>,
            d: SimulationNode,
          ) => {
            d.fx = null
            d.fy = null
          },
        ),
    )

    setupNodeEvents(node, links)

    const updatePositions = createUpdatePositionsFunction({
      link,
      node,
      nodePositionMap: nodeMap,
      getNodeRadius,
    })

    const zoom = setupZoomBehavior(svg, g, { onInteractionStart: () => handleNodeHover(null) })
    updatePositions()

    nodeSelectionRef.current = node
    linkSelectionRef.current = link
    zoomRef.current = zoom
    nodesRef.current = nodes

    applyVisualization(node, link, zoom, svg, nodes, focusedDomain, undefined, isGraphDataChange)
    svg.on('click', handleBackgroundClick)
  }, [
    filteredNodes,
    filteredEdges,
    allEdgesForTracing,
    theme,
    dimensions,
    focusedDomain,
    applyVisualization,
    setupNodeEvents,
    handleBackgroundClick,
  ])

  useEffect(() => {
    const node = nodeSelectionRef.current
    const link = linkSelectionRef.current
    if (!node || !link) return

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

    if (highlightCleared && svgRef.current && zoomRef.current && nodesRef.current.length > 0) {
      const svg = d3.select(svgRef.current)
      fitViewportFn(svg, zoomRef.current, nodesRef.current)
    }
  }, [highlightedNodeIds, allEdgesForTracing, fitViewportFn])

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden rounded-lg"
      data-testid="force-graph-container"
      data-highlighted-node={highlightedNodeId}
    >
      <div className="canvas-background absolute inset-0" />
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="relative z-10"
        data-testid="force-graph-svg"
      />
    </div>
  )
}
