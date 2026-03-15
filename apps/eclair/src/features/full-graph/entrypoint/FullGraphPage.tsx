import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { RiviereGraph } from '@living-architecture/riviere-schema'
import type { NodeType, Node, Edge } from '../queries/eclair-types'
import { useTheme } from '@/platform/infra/theme/ThemeContext'
import { useExport } from '@/platform/infra/export/ExportContext'
import {
  generateExportFilename,
  exportElementAsPng,
  exportSvgAsFile,
  UNNAMED_GRAPH_EXPORT_NAME,
} from '@/platform/infra/export/export-graph'
import { ForceGraph } from '@/platform/infra/graph/ForceGraph/ForceGraph'
import { ClusteredGraph } from '@/platform/infra/graph/ClusteredGraph/ClusteredGraph'
import { GraphTooltip } from '@/platform/infra/graph/GraphTooltip/GraphTooltip'
import { DomainFilters } from '../components/DomainFilters/DomainFilters'
import { NodeTypeFilters } from '../components/NodeTypeFilters/NodeTypeFilters'
import {
  FullGraphViewTabs,
  type FullGraphViewMode,
} from '../components/FullGraphViewTabs/FullGraphViewTabs'
import { filterByNodeType, getThemeFocusColors } from '../queries/graph-focusing'
import {
  computeClusteredGraphLayout,
  type ClusteredGraphLayout,
} from '../queries/computeClusteredGraphLayout'
import type { TooltipData } from '@/platform/infra/graph/graph-types'

function compareByCodePoint(a: string, b: string): number {
  if (a < b) return -1
  if (a > b) return 1
  return 0
}

function findOrphanNodeIds(
  nodes: Node[],
  edges: Edge[],
  externalLinks: RiviereGraph['externalLinks'],
): Set<string> {
  const connectedNodeIds = new Set<string>()
  for (const edge of edges) {
    connectedNodeIds.add(edge.source)
    connectedNodeIds.add(edge.target)
  }

  for (const link of externalLinks ?? []) {
    connectedNodeIds.add(link.source)
  }

  const orphanIds = new Set<string>()
  for (const node of nodes) {
    if (!connectedNodeIds.has(node.id)) {
      orphanIds.add(node.id)
    }
  }
  return orphanIds
}

interface FullGraphPageProps {
  readonly graph: RiviereGraph
}

interface DomainInfo {
  name: string
  nodeCount: number
}

interface NodeTypeInfo {
  type: NodeType
  nodeCount: number
}

function extractDomains(graph: RiviereGraph): DomainInfo[] {
  const domainCounts = new Map<string, number>()

  for (const node of graph.components) {
    const count = domainCounts.get(node.domain) ?? 0
    domainCounts.set(node.domain, count + 1)
  }

  return Array.from(domainCounts.entries())
    .map(([name, nodeCount]) => ({
      name,
      nodeCount,
    }))
    .sort((a, b) => compareByCodePoint(a.name, b.name))
}

function extractNodeTypes(graph: RiviereGraph): NodeTypeInfo[] {
  const typeCounts = new Map<NodeType, number>()

  for (const node of graph.components) {
    const count = typeCounts.get(node.type) ?? 0
    typeCounts.set(node.type, count + 1)
  }

  if (graph.externalLinks !== undefined && graph.externalLinks.length > 0) {
    const uniqueExternals = new Set(graph.externalLinks.map((l) => l.target.name))
    typeCounts.set('External', uniqueExternals.size)
  }

  return Array.from(typeCounts.entries())
    .map(([type, nodeCount]) => ({
      type,
      nodeCount,
    }))
    .sort((a, b) => compareByCodePoint(a.type, b.type))
}

export function FullGraphPage({ graph }: Readonly<FullGraphPageProps>): React.ReactElement {
  const { theme } = useTheme()
  const { registerExportHandlers, clearExportHandlers } = useExport()
  const [searchParams] = useSearchParams()
  const [tooltipData, setTooltipData] = useState<TooltipData | null>(null)
  const tooltipHideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const exportContainerRef = useRef<HTMLDivElement>(null)
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(null)
  const [filterPanelOpen, setFilterPanelOpen] = useState(false)
  const [viewMode, setViewMode] = useState<FullGraphViewMode>('graph')
  const [clusteredLayout, setClusteredLayout] = useState<ClusteredGraphLayout | null>(null)
  const [visibleTypes, setVisibleTypes] = useState<Set<NodeType>>(() => {
    const types = new Set<NodeType>(graph.components.map((n) => n.type))
    if (graph.externalLinks !== undefined && graph.externalLinks.length > 0) {
      types.add('External')
    }
    return types
  })
  const HIDE_ALL_DOMAINS = '__HIDE_ALL__'
  const [focusedDomain, setFocusedDomain] = useState<string | null>(null)

  const visibleDomains = useMemo(() => {
    if (focusedDomain === HIDE_ALL_DOMAINS) {
      return new Set<string>()
    }
    if (focusedDomain) {
      return new Set([focusedDomain])
    }
    return new Set(graph.components.map((n) => n.domain))
  }, [focusedDomain, graph.components, HIDE_ALL_DOMAINS])

  const domains = useMemo(() => extractDomains(graph), [graph])
  const nodeTypes = useMemo(() => extractNodeTypes(graph), [graph])
  const domainCount = new Set(graph.components.map((n) => n.domain)).size

  const filteredGraph = useMemo(() => {
    const typeFiltered = filterByNodeType(graph.components, graph.links, visibleTypes)
    const externalVisible = visibleTypes.has('External')
    const typeFilteredExternalLinks = externalVisible ? (graph.externalLinks ?? []) : []

    const orphanNodeIds = findOrphanNodeIds(
      typeFiltered.nodes,
      typeFiltered.edges,
      typeFilteredExternalLinks,
    )

    const nonOrphanNodes = typeFiltered.nodes.filter((n) => !orphanNodeIds.has(n.id))

    const nonOrphanEdges = typeFiltered.edges.filter(
      (e) => !orphanNodeIds.has(e.source) && !orphanNodeIds.has(e.target),
    )

    const visibleNodeIds = new Set(nonOrphanNodes.map((node) => node.id))
    const externalLinks = typeFilteredExternalLinks.filter((link) =>
      visibleNodeIds.has(link.source),
    )

    return {
      nodes: nonOrphanNodes,
      edges: nonOrphanEdges,
      externalLinks,
    }
  }, [graph, visibleTypes])

  const renderedExternalNodeCount = useMemo(() => {
    return new Set(filteredGraph.externalLinks.map((link) => link.target.name)).size
  }, [filteredGraph.externalLinks])

  const renderedNodeCount = filteredGraph.nodes.length + renderedExternalNodeCount
  const renderedEdgeCount = filteredGraph.edges.length + filteredGraph.externalLinks.length

  useEffect(() => {
    const nodeFromUrl = searchParams.get('node')
    if (nodeFromUrl === null) {
      setHighlightedNodeId(null)
      return
    }
    const nodeExists = filteredGraph.nodes.some((n) => n.id === nodeFromUrl)
    setHighlightedNodeId(nodeExists ? nodeFromUrl : null)
  }, [searchParams, filteredGraph.nodes])

  const handleNodeClick = useCallback((nodeId: string) => {
    setHighlightedNodeId((prev) => (prev === nodeId ? null : nodeId))
    setTooltipData(null)
  }, [])

  const handleBackgroundClick = useCallback(() => {
    setHighlightedNodeId(null)
  }, [])

  const handleNodeHover = useCallback((data: TooltipData | null) => {
    if (tooltipHideTimeoutRef.current) {
      clearTimeout(tooltipHideTimeoutRef.current)
      tooltipHideTimeoutRef.current = null
    }

    if (data) {
      setTooltipData(data)
    } else {
      tooltipHideTimeoutRef.current = setTimeout(() => {
        setTooltipData(null)
      }, 200)
    }
  }, [])

  const handleTooltipMouseEnter = useCallback(() => {
    if (tooltipHideTimeoutRef.current) {
      clearTimeout(tooltipHideTimeoutRef.current)
      tooltipHideTimeoutRef.current = null
    }
  }, [])

  const handleTooltipMouseLeave = useCallback(() => {
    tooltipHideTimeoutRef.current = setTimeout(() => {
      setTooltipData(null)
    }, 200)
  }, [])

  useEffect(() => {
    return () => {
      if (tooltipHideTimeoutRef.current) {
        clearTimeout(tooltipHideTimeoutRef.current)
      }
    }
  }, [])

  const handleToggleDomain = useCallback((domain: string) => {
    setFocusedDomain((prev) => (prev === domain ? null : domain))
  }, [])

  const handleShowAllDomains = useCallback(() => {
    setFocusedDomain(null)
  }, [])

  const handleHideAllDomains = useCallback(() => {
    setFocusedDomain(HIDE_ALL_DOMAINS)
  }, [HIDE_ALL_DOMAINS])

  const focusColors = getThemeFocusColors(theme)

  const handleToggleType = useCallback((type: NodeType) => {
    setVisibleTypes((prev) => {
      const next = new Set(prev)
      if (next.has(type)) {
        next.delete(type)
        return next
      }
      next.add(type)
      return next
    })
  }, [])

  const handleShowAllTypes = useCallback(() => {
    setVisibleTypes(new Set(nodeTypes.map((nt) => nt.type)))
  }, [nodeTypes])

  const handleHideAllTypes = useCallback(() => {
    setVisibleTypes(new Set())
  }, [])

  const toggleFilterPanel = useCallback(() => {
    setFilterPanelOpen((prev) => !prev)
  }, [])

  useEffect(() => {
    const graphName = graph.metadata.name ?? UNNAMED_GRAPH_EXPORT_NAME

    const handleExportPng = (): void => {
      if (exportContainerRef.current) {
        const filename = generateExportFilename(graphName, 'png')
        const backgroundColor = getComputedStyle(document.documentElement)
          .getPropertyValue('--bg-primary')
          .trim()
        exportElementAsPng(exportContainerRef.current, filename, { backgroundColor }).catch(
          console.error,
        )
      }
    }

    const handleExportSvg = (): void => {
      const svg = exportContainerRef.current?.querySelector('svg')
      if (svg instanceof SVGSVGElement) {
        const filename = generateExportFilename(graphName, 'svg')
        exportSvgAsFile(svg, filename)
      }
    }

    registerExportHandlers({
      onPng: handleExportPng,
      onSvg: handleExportSvg,
    })

    return () => {
      clearExportHandlers()
    }
  }, [graph.metadata.name, registerExportHandlers, clearExportHandlers])

  const highlightedNodeIds = highlightedNodeId ? new Set([highlightedNodeId]) : undefined
  const renderedGraph = {
    ...graph,
    components: filteredGraph.nodes,
    links: filteredGraph.edges,
    externalLinks: filteredGraph.externalLinks,
  }

  useEffect(() => {
    if (viewMode !== 'clustered') {
      return
    }

    const cancelled = { value: false }
    setClusteredLayout(null)

    void computeClusteredGraphLayout({
      nodes: renderedGraph.components,
      edges: renderedGraph.links,
      externalLinks: renderedGraph.externalLinks,
    })
      .then((nextLayout) => {
        if (!cancelled.value) {
          setClusteredLayout(nextLayout)
        }
      })
      .catch((error: unknown) => {
        console.error(error)
      })

    return () => {
      cancelled.value = true
    }
  }, [renderedGraph.components, renderedGraph.links, renderedGraph.externalLinks, viewMode])

  return (
    <div ref={exportContainerRef} className="relative h-full w-full" data-testid="full-graph-page">
      {viewMode === 'graph' ? (
        <ForceGraph
          graph={renderedGraph}
          theme={theme}
          highlightedNodeIds={highlightedNodeIds}
          highlightedNodeId={highlightedNodeId}
          focusedDomain={focusedDomain}
          onNodeClick={handleNodeClick}
          onNodeHover={handleNodeHover}
          onBackgroundClick={handleBackgroundClick}
        />
      ) : (
        <ClusteredGraph
          layout={clusteredLayout}
          theme={theme}
          highlightedNodeIds={highlightedNodeIds}
          highlightedNodeId={highlightedNodeId}
          focusedDomain={focusedDomain}
          onNodeClick={handleNodeClick}
          onNodeHover={handleNodeHover}
          onBackgroundClick={handleBackgroundClick}
        />
      )}

      {focusedDomain !== null && focusedDomain !== HIDE_ALL_DOMAINS && (
        <div
          className="pointer-events-none absolute inset-0 transition-opacity duration-600"
          style={{ backgroundColor: focusColors.overlayBackground }}
        />
      )}

      <GraphTooltip
        data={tooltipData}
        onMouseEnter={handleTooltipMouseEnter}
        onMouseLeave={handleTooltipMouseLeave}
      />

      <div className="absolute left-2 top-4 z-10 flex max-w-[calc(100%-4rem)] flex-col gap-3 md:left-4 md:max-w-lg">
        {focusedDomain !== null && focusedDomain !== HIDE_ALL_DOMAINS ? (
          <div
            className="floating-panel animate-fade-in border-l-8 px-8 py-6"
            style={{
              borderLeftColor: focusColors.borderColor,
              boxShadow: `0 0 60px ${focusColors.shadowColor}, 0 8px 24px rgba(0, 0, 0, ${theme === 'voltage' ? 0.3 : 0.12})`,
              background: theme === 'voltage' ? 'rgba(26, 26, 36, 0.95)' : undefined,
            }}
            data-testid="focused-domain-banner"
          >
            <div className="flex items-center gap-4">
              <div
                className="h-4 w-4 animate-pulse rounded-full"
                style={{
                  backgroundColor: focusColors.glowColor,
                  boxShadow: `0 0 20px ${focusColors.shadowColor}`,
                }}
              />
              <div className="text-2xl font-extrabold tracking-tight text-[var(--text-primary)] md:text-4xl">
                {focusedDomain}
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 text-sm font-semibold text-[var(--text-secondary)] md:text-base">
              <i className="ph ph-circles-three text-base md:text-lg" />
              <span>
                {filteredGraph.nodes.filter((n) => n.domain === focusedDomain).length} nodes focused
              </span>
            </div>
            <button
              type="button"
              onClick={handleShowAllDomains}
              className="mt-4 flex items-center gap-2 text-sm font-medium transition-colors"
              style={{ color: focusColors.borderColor }}
            >
              <i className="ph ph-x-circle text-base" />
              <span>Clear focus</span>
            </button>
          </div>
        ) : (
          <div className="floating-panel" data-testid="stats-panel">
            <div className="mb-2 flex items-start justify-between gap-6">
              <div>
                <h1 className="text-sm font-semibold text-[var(--text-primary)]">Full Graph</h1>
                <div className="mt-1 flex flex-wrap gap-2 text-xs text-[var(--text-secondary)] md:gap-4">
                  <span>{renderedNodeCount} nodes</span>
                  <span>{renderedEdgeCount} edges</span>
                  <span>{domainCount} domains</span>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
                <i className="ph ph-sparkle text-sm" aria-hidden="true" />
                <span>{viewMode === 'clustered' ? 'Clustered view' : 'Graph view'}</span>
              </div>
            </div>
          </div>
        )}

        <div className="floating-panel w-fit max-w-full">
          <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
            <i className="ph ph-layout text-sm" aria-hidden="true" />
            <span>View mode</span>
          </div>
          <FullGraphViewTabs viewMode={viewMode} onChange={setViewMode} />
        </div>
      </div>

      <div
        className="floating-panel absolute right-2 top-4 md:right-4"
        data-testid="filter-panel-toggle"
      >
        <button
          type="button"
          onClick={toggleFilterPanel}
          className="flex h-9 w-9 items-center justify-center rounded-md border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
          aria-label="Toggle filters"
          aria-expanded={filterPanelOpen}
          data-testid="filter-toggle"
        >
          <i className="ph ph-funnel text-lg" aria-hidden="true" />
        </button>
      </div>

      {filterPanelOpen && (
        <div
          className="floating-panel absolute right-2 top-20 w-full max-w-xs space-y-3 md:right-4 md:w-56"
          data-testid="filter-panel"
        >
          <DomainFilters
            domains={domains}
            visibleDomains={visibleDomains}
            onToggleDomain={handleToggleDomain}
            onShowAll={handleShowAllDomains}
            onHideAll={handleHideAllDomains}
          />
          <NodeTypeFilters
            nodeTypes={nodeTypes}
            visibleTypes={visibleTypes}
            onToggleType={handleToggleType}
            onShowAll={handleShowAllTypes}
            onHideAll={handleHideAllTypes}
          />
        </div>
      )}
    </div>
  )
}
