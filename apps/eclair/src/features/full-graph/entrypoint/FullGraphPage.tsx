import {
  useState, useCallback, useMemo, useRef, useEffect 
} from 'react'
import { useSearchParams } from 'react-router-dom'
import type { RiviereGraph } from '@living-architecture/riviere-schema'
import type {
  Node, Edge,
} from '../queries/eclair-types'
import { extractNodeTypes } from '../queries/extract-node-types'
import { useTheme } from '@/platform/infra/theme/ThemeContext'
import { useExport } from '@/platform/infra/export/ExportContext'
import {
  generateExportFilename,
  exportElementAsPng,
  exportSvgAsFile,
  UNNAMED_GRAPH_EXPORT_NAME,
} from '@/platform/infra/export/export-graph'
import { ForceGraph } from '@/platform/infra/graph/ForceGraph/ForceGraph'
import { GraphTooltip } from '@/platform/infra/graph/GraphTooltip/GraphTooltip'
import { DomainFilters } from '../components/DomainFilters/DomainFilters'
import { NodeTypeFilters } from '../components/NodeTypeFilters/NodeTypeFilters'
import {
  filterByNodeType, getThemeFocusColors,
} from '../queries/graph-focusing'
import type { TooltipData } from '@/platform/infra/graph/graph-types'

function compareByCodePoint(a: string, b: string): number {
  if (a < b) return -1
  if (a > b) return 1
  return 0
}

function findOrphanNodeIds(nodes: Node[], edges: Edge[]): Set<string> {
  const connectedNodeIds = new Set<string>()
  for (const edge of edges) {
    connectedNodeIds.add(edge.source)
    connectedNodeIds.add(edge.target)
  }

  const orphanIds = new Set<string>()
  for (const node of nodes) {
    if (!connectedNodeIds.has(node.id)) {
      orphanIds.add(node.id)
    }
  }
  return orphanIds
}

interface FullGraphPageProps {readonly graph: RiviereGraph}

interface DomainInfo {
  name: string
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

export function FullGraphPage({ graph }: Readonly<FullGraphPageProps>): React.ReactElement {
  const { theme } = useTheme()
  const {
    registerExportHandlers, clearExportHandlers 
  } = useExport()
  const [searchParams] = useSearchParams()
  const [tooltipData, setTooltipData] = useState<TooltipData | null>(null)
  const tooltipHideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const exportContainerRef = useRef<HTMLDivElement>(null)
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(null)
  const [filterPanelOpen, setFilterPanelOpen] = useState(false)
  const [visibleTypes, setVisibleTypes] = useState<Set<string>>(
    () => new Set(extractNodeTypes(graph).map((nodeType) => nodeType.type)),
  )
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

    const orphanNodeIds = findOrphanNodeIds(typeFiltered.nodes, typeFiltered.edges)

    const nonOrphanNodes = typeFiltered.nodes.filter((n) => !orphanNodeIds.has(n.id))

    const nonOrphanEdges = typeFiltered.edges.filter(
      (e) => !orphanNodeIds.has(e.source) && !orphanNodeIds.has(e.target),
    )

    return {
      nodes: nonOrphanNodes,
      edges: nonOrphanEdges,
    }
  }, [graph, visibleTypes])

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

  const handleToggleType = useCallback((type: string) => {
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

  return (
    <div ref={exportContainerRef} className="relative h-full w-full" data-testid="full-graph-page">
      <ForceGraph
        graph={{
          ...graph,
          components: filteredGraph.nodes,
          links: filteredGraph.edges,
        }}
        theme={theme}
        highlightedNodeIds={highlightedNodeIds}
        highlightedNodeId={highlightedNodeId}
        focusedDomain={focusedDomain}
        onNodeClick={handleNodeClick}
        onNodeHover={handleNodeHover}
        onBackgroundClick={handleBackgroundClick}
      />

      <GraphTooltip
        data={tooltipData}
        onMouseEnter={handleTooltipMouseEnter}
        onMouseLeave={handleTooltipMouseLeave}
      />

      {focusedDomain !== null && focusedDomain !== HIDE_ALL_DOMAINS && (
        <div
          className="floating-panel focused-domain-indicator animate-fade-in"
          style={{ borderColor: focusColors.borderColor }}
          data-testid="focused-domain-banner"
        >
          <div
            className="h-3 w-3 shrink-0 rounded-full"
            style={{
              backgroundColor: focusColors.glowColor,
              boxShadow: `0 0 10px ${focusColors.shadowColor}`,
            }}
          />
          <div className="min-w-0 flex-1">
            <div className="focused-domain-indicator-name">{focusedDomain}</div>
            <div className="focused-domain-indicator-count">
              {filteredGraph.nodes.filter((node) => node.domain === focusedDomain).length} nodes
            </div>
          </div>
          <button
            type="button"
            onClick={handleShowAllDomains}
            className="focused-domain-indicator-clear"
            title="Clear focus"
            aria-label="Clear focus"
          >
            <i className="ph ph-x" aria-hidden="true" />
          </button>
        </div>
      )}

      {!focusedDomain && (
        <div className="floating-panel absolute left-2 top-4 md:left-4" data-testid="stats-panel">
          <h1 className="mb-1 text-sm font-semibold text-[var(--text-primary)]">Full Graph</h1>
          <div className="flex flex-wrap gap-2 text-xs text-[var(--text-secondary)] md:gap-4">
            <span>{filteredGraph.nodes.length} nodes</span>
            <span>{filteredGraph.edges.length} edges</span>
            <span>{domainCount} domains</span>
          </div>
        </div>
      )}

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
          className="floating-panel full-graph-filter-panel space-y-3"
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
            theme={theme}
          />
        </div>
      )}
    </div>
  )
}
