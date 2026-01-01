import { useEffect, useRef, useCallback, useState } from 'react'
import * as d3 from 'd3'
import dagre from 'dagre'
import type { RiviereGraph } from '@/types/riviere'
import type { Theme } from '@/types/theme'
import type { SimulationNode, SimulationLink, TooltipData } from '../../types'
import { NODE_RADII } from '../../types'
import { getThemeFocusColors } from '../../graphFocusing/themeFocusColors'
import { FOCUS_MODE_TRANSITIONS, FOCUS_MODE_NODE_SCALES, FOCUS_MODE_OPACITY, FOCUS_MODE_STROKES, FOCUS_MODE_TEXT, UNFOCUSED_NODE_STROKE_COLOR } from '../../graphFocusing/focusModeConstants'
import {
  updateHighlight,
  setupSVGFiltersAndMarkers,
  getLinkNodeId,
  applyFocusModeCircleStyles,
  applyResetModeCircleStyles,
  calculateFitViewportTransform,
  applyFocusModeLinkStyles,
  applyResetModeLinkStyles,
  applyFocusModeTextStyles,
  applyResetModeTextStyles,
  setupLinks,
  setupNodes,
  createUpdatePositionsFunction,
  calculateFocusModeZoom,
  applyDagrePositions,
  setupZoomBehavior,
} from './GraphRenderingSetup'
import {
  createSimulationNodes,
  createSimulationLinks,
  createExternalNodes,
  createExternalLinks,
  createLayoutEdges,
  getNodeColor,
  getNodeRadius,
  getEdgeColor,
  isAsyncEdge,
  truncateName,
  getDomainColor,
} from './VisualizationDataAdapters'

interface DagreLayoutInput {
  nodes: SimulationNode[]
  edges: Array<{ source: string; target: string }>
}

function computeDagreLayout(input: DagreLayoutInput): Map<string, { x: number; y: number }> {
  const g = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}))

  g.setGraph({
    rankdir: 'LR',
    nodesep: 50,
    ranksep: 120,
    marginx: 40,
    marginy: 40,
  })

  for (const node of input.nodes) {
    const radius = NODE_RADII[node.type]
    const size = radius * 2 + 40
    g.setNode(node.id, { width: size, height: size })
  }

  for (const edge of input.edges) {
    g.setEdge(edge.source, edge.target)
  }

  dagre.layout(g)

  const positions = new Map<string, { x: number; y: number }>()
  for (const node of input.nodes) {
    const layoutNode = g.node(node.id)
    positions.set(node.id, { x: layoutNode.x, y: layoutNode.y })
  }

  return positions
}

interface ForceGraphProps {
  graph: RiviereGraph
  theme: Theme
  highlightedNodeIds?: Set<string> | undefined
  highlightedNodeId?: string | null
  visibleNodeIds?: Set<string> | undefined
  focusedDomain?: string | null
  onNodeClick?: (nodeId: string) => void
  onNodeHover?: (data: TooltipData | null) => void
  onBackgroundClick?: () => void
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
}: ForceGraphProps): React.ReactElement {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const lastGraphKeyRef = useRef<string>('')
  const nodeSelectionRef = useRef<d3.Selection<SVGGElement, SimulationNode, SVGGElement, unknown> | null>(null)
  const linkSelectionRef = useRef<d3.Selection<SVGPathElement, SimulationLink, SVGGElement, unknown> | null>(null)

  const filteredNodes = visibleNodeIds
    ? graph.components.filter((n) => visibleNodeIds.has(n.id))
    : graph.components

  const filteredEdges = visibleNodeIds
    ? graph.links.filter(
        (e) => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target)
      )
    : graph.links

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
    [onNodeClick]
  )

  const handleNodeHover = useCallback(
    (data: TooltipData | null) => {
      onNodeHover?.(data)
    },
    [onNodeHover]
  )

  const applyFocusMode = useCallback(
    (
      svg: d3.Selection<SVGSVGElement, unknown, d3.BaseType, unknown>,
      node: d3.Selection<SVGGElement, SimulationNode, SVGGElement, unknown>,
      link: d3.Selection<SVGPathElement, SimulationLink, SVGGElement, unknown>,
      zoom: d3.ZoomBehavior<SVGSVGElement, unknown>,
      nodes: SimulationNode[],
      domain: string
    ) => {
      const focusColors = getThemeFocusColors(theme)

      applyFocusModeCircleStyles({
        node,
        focusedDomain: domain,
        focusColors,
        transitionDuration: FOCUS_MODE_TRANSITIONS.elementAnimation,
        nodeRadiusScale: FOCUS_MODE_NODE_SCALES,
        opacityValues: FOCUS_MODE_OPACITY,
        strokeWidths: FOCUS_MODE_STROKES,
        getNodeRadius,
        unfocusedStrokeColor: UNFOCUSED_NODE_STROKE_COLOR,
      })

      applyFocusModeTextStyles({
        node,
        focusedDomain: domain,
        transitionDuration: FOCUS_MODE_TRANSITIONS.elementAnimation,
        selector: '.node-label',
        focusedOpacity: 1,
        focusedFontSize: FOCUS_MODE_TEXT.focusedLabelSize,
        focusedFontWeight: FOCUS_MODE_TEXT.focusedLabelWeight,
        unfocusedFontSize: FOCUS_MODE_TEXT.unfocusedLabelSize,
        unfocusedFontWeight: FOCUS_MODE_TEXT.unfocusedLabelWeight,
      })

      applyFocusModeTextStyles({
        node,
        focusedDomain: domain,
        transitionDuration: FOCUS_MODE_TRANSITIONS.elementAnimation,
        selector: '.node-domain-label',
        focusedOpacity: 1,
        focusedFontSize: FOCUS_MODE_TEXT.focusedDomainSize,
        focusedFontWeight: FOCUS_MODE_TEXT.focusedDomainWeight,
        unfocusedFontSize: FOCUS_MODE_TEXT.unfocusedDomainSize,
        unfocusedFontWeight: FOCUS_MODE_TEXT.unfocusedDomainWeight,
      })

      applyFocusModeLinkStyles({
        link,
        nodes,
        focusedDomain: domain,
        transitionDuration: FOCUS_MODE_TRANSITIONS.elementAnimation,
        focusedOpacity: FOCUS_MODE_OPACITY.focusedEdge,
        unfocusedOpacity: FOCUS_MODE_OPACITY.unfocusedEdge,
        focusedStrokeWidth: FOCUS_MODE_STROKES.focusedEdgeWidth,
        unfocusedStrokeWidth: FOCUS_MODE_STROKES.unfocusedEdgeWidth,
      })

      const focusZoom = calculateFocusModeZoom({
        nodes,
        focusedDomain: domain,
        dimensions,
      })

      if (focusZoom) {
        svg
          .transition()
          .duration(FOCUS_MODE_TRANSITIONS.zoomAnimation)
          .call(
            zoom.transform,
            d3.zoomIdentity.translate(focusZoom.translateX, focusZoom.translateY).scale(focusZoom.scale)
          )
      }
    },
    [theme, dimensions]
  )

  const handleBackgroundClick = useCallback(() => {
    onBackgroundClick?.()
  }, [onBackgroundClick])

  const applyResetMode = useCallback(
    (
      node: d3.Selection<SVGGElement, SimulationNode, SVGGElement, unknown>,
      link: d3.Selection<SVGPathElement, SimulationLink, SVGGElement, unknown>
    ) => {
      applyResetModeCircleStyles({
        node,
        transitionDuration: FOCUS_MODE_TRANSITIONS.elementAnimation,
        getNodeRadius,
      })

      applyResetModeTextStyles({
        node,
        transitionDuration: FOCUS_MODE_TRANSITIONS.elementAnimation,
        selector: '.node-label',
        opacity: 1,
        fontSize: '11px',
        fontWeight: 600,
      })

      applyResetModeTextStyles({
        node,
        transitionDuration: FOCUS_MODE_TRANSITIONS.elementAnimation,
        selector: '.node-domain-label',
        opacity: 1,
        fontSize: '9px',
        fontWeight: 500,
      })

      applyResetModeLinkStyles({
        link,
        transitionDuration: FOCUS_MODE_TRANSITIONS.elementAnimation,
      })
    },
    []
  )

  const fitViewportFn = useCallback(
    (
      svg: d3.Selection<SVGSVGElement, unknown, d3.BaseType, unknown>,
      zoom: d3.ZoomBehavior<SVGSVGElement, unknown>,
      nodes: SimulationNode[]
    ) => {
      const { translateX, translateY, scale } = calculateFitViewportTransform({
        nodes,
        dimensions,
        padding: 80,
      })

      const svgElement = svg.node()
      if (!svgElement?.viewBox?.baseVal) {
        throw new Error('SVG element does not support viewBox.baseVal - zoom requires full SVG support')
      }
      svg.call(zoom.transform, d3.zoomIdentity.translate(translateX, translateY).scale(scale))
    },
    [dimensions]
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
      shouldFitViewport: boolean
    ) => {
      if (domain) {
        applyFocusMode(svg, node, link, zoom, nodes, domain)
        return
      }
      if (highlightIds) {
        return
      }
      applyResetMode(node, link)
      if (shouldFitViewport && nodes.length > 0 && dimensions.width > 0 && dimensions.height > 0) {
        fitViewportFn(svg, zoom, nodes)
      }
    },
    [applyFocusMode, applyResetMode, fitViewportFn, dimensions]
  )

  const setupNodeEvents = useCallback(
    (
      node: d3.Selection<SVGGElement, SimulationNode, SVGGElement, unknown>,
      links: SimulationLink[]
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
    [handleNodeClick, handleNodeHover]
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

    const currentGraphKey = filteredNodes.map((n) => n.id).sort((a, b) => a.localeCompare(b)).join(',')
    const isGraphDataChange = currentGraphKey !== lastGraphKeyRef.current
    lastGraphKeyRef.current = currentGraphKey

    const uniqueDomains = [...new Set(nodes.map((n) => n.domain))]
    const edgesForLayout = createLayoutEdges(filteredEdges, graph.externalLinks)

    const positions = computeDagreLayout({ nodes, edges: edgesForLayout })
    applyDagrePositions({ nodes, positions })

    const g = svg.append('g').attr('class', 'graph-container')

    const defs = svg.append('defs')
    setupSVGFiltersAndMarkers(defs, theme)

    const linkGroup = g.append('g').attr('class', 'links')
    const nodeGroup = g.append('g').attr('class', 'nodes')

    const link = setupLinks({
      linkGroup,
      links,
      theme,
      getEdgeColor,
      isAsyncEdge,
    })

    const nodePositionMap = new Map<string, SimulationNode>()
    for (const n of nodes) {
      nodePositionMap.set(n.id, n)
    }

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
        .on('start', (_event: d3.D3DragEvent<SVGGElement, SimulationNode, SimulationNode>, d: SimulationNode) => {
          handleNodeHover(null)
          d.fx = d.x
          d.fy = d.y
        })
        .on('drag', (event: d3.D3DragEvent<SVGGElement, SimulationNode, SimulationNode>, d: SimulationNode) => {
          d.x = event.x
          d.y = event.y
          d.fx = event.x
          d.fy = event.y
          updatePositions()
        })
        .on('end', (_event: d3.D3DragEvent<SVGGElement, SimulationNode, SimulationNode>, d: SimulationNode) => {
          d.fx = null
          d.fy = null
        })
    )

    setupNodeEvents(node, links)

    const updatePositions = createUpdatePositionsFunction({
      link,
      node,
      nodePositionMap,
      getNodeRadius,
    })

    const zoom = setupZoomBehavior(svg, g, {
      onInteractionStart: () => handleNodeHover(null),
    })
    updatePositions()

    nodeSelectionRef.current = node
    linkSelectionRef.current = link

    applyVisualization(node, link, zoom, svg, nodes, focusedDomain, undefined, isGraphDataChange)
    svg.on('click', handleBackgroundClick)

    updateHighlight({ node, link, filteredEdges, highlightedNodeIds })
  }, [filteredNodes, filteredEdges, theme, dimensions, focusedDomain, highlightedNodeIds, applyVisualization, setupNodeEvents, handleBackgroundClick, handleNodeHover])

  useEffect(() => {
    const node = nodeSelectionRef.current
    const link = linkSelectionRef.current
    if (!node || !link) return

    updateHighlight({ node, link, filteredEdges, highlightedNodeIds })
  }, [highlightedNodeIds, filteredEdges])

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden rounded-lg" data-testid="force-graph-container" data-highlighted-node={highlightedNodeId}>
      <div className="canvas-background absolute inset-0" />
      <svg ref={svgRef} width={dimensions.width} height={dimensions.height} className="relative z-10" data-testid="force-graph-svg" />
    </div>
  )
}
