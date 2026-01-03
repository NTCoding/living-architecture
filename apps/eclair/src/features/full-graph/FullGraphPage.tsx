import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { RiviereGraph, NodeType } from '@/types/riviere'
import { useTheme } from '@/contexts/ThemeContext'
import { useExport } from '@/contexts/ExportContext'
import {
  generateExportFilename,
  exportElementAsPng,
  exportSvgAsFile,
  UNNAMED_GRAPH_EXPORT_NAME,
} from '@/lib/exportGraph'
import { ForceGraph } from './components/ForceGraph/ForceGraph'
import { GraphTooltip } from './components/GraphTooltip/GraphTooltip'
import { DomainFilters } from './components/DomainFilters/DomainFilters'
import { NodeTypeFilters } from './components/NodeTypeFilters/NodeTypeFilters'
import { filterByNodeType } from './graphFocusing/filterByNodeType'
import { getThemeFocusColors } from './graphFocusing/themeFocusColors'
import type { TooltipData } from './types'
import type { Node, Edge } from '@/types/riviere'

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
    .map(([name, nodeCount]) => ({ name, nodeCount }))
    .sort((a, b) => a.name.localeCompare(b.name))
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
    .map(([type, nodeCount]) => ({ type, nodeCount }))
    .sort((a, b) => a.type.localeCompare(b.type))
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
  const [visibleTypes, setVisibleTypes] = useState<Set<NodeType>>(() => {
    const types = new Set(graph.components.map((n) => n.type))
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
    const typeFiltered = filterByNodeType(
      graph.components,
      graph.links,
      visibleTypes
    )

    const orphanNodeIds = findOrphanNodeIds(typeFiltered.nodes, typeFiltered.edges)

    const nonOrphanNodes = typeFiltered.nodes.filter(
      (n) => !orphanNodeIds.has(n.id)
    )

    const nonOrphanEdges = typeFiltered.edges.filter(
      (e) => !orphanNodeIds.has(e.source) && !orphanNodeIds.has(e.target)
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
        exportElementAsPng(exportContainerRef.current, filename, { backgroundColor }).catch(console.error)
      }
    }

    const handleExportSvg = (): void => {
      const svg = exportContainerRef.current?.querySelector('svg')
      if (svg instanceof SVGSVGElement) {
        const filename = generateExportFilename(graphName, 'svg')
        exportSvgAsFile(svg, filename)
      }
    }

    registerExportHandlers({ onPng: handleExportPng, onSvg: handleExportSvg })

    return () => {
      clearExportHandlers()
    }
  }, [graph.metadata.name, registerExportHandlers, clearExportHandlers])

  const highlightedNodeIds = highlightedNodeId
    ? new Set([highlightedNodeId])
    : undefined

  return (
    <div ref={exportContainerRef} className="relative h-full w-full" data-testid="full-graph-page">
      <ForceGraph
        graph={{ ...graph, components: filteredGraph.nodes, links: filteredGraph.edges }}
        theme={theme}
        highlightedNodeIds={highlightedNodeIds}
        highlightedNodeId={highlightedNodeId}
        focusedDomain={focusedDomain}
        onNodeClick={handleNodeClick}
        onNodeHover={handleNodeHover}
        onBackgroundClick={handleBackgroundClick}
      />

      {focusedDomain !== null && focusedDomain !== HIDE_ALL_DOMAINS && (
        <div
          className="pointer-events-none absolute inset-0 transition-opacity duration-600"
          style={{
            backgroundColor: focusColors.overlayBackground,
          }}
        />
      )}

      <GraphTooltip
        data={tooltipData}
        onMouseEnter={handleTooltipMouseEnter}
        onMouseLeave={handleTooltipMouseLeave}
      />

      {focusedDomain !== null && focusedDomain !== HIDE_ALL_DOMAINS && (
        <div
          className="floating-panel absolute left-2 right-2 top-4 animate-fade-in border-l-8 px-8 py-6 md:left-4 md:right-auto md:max-w-md"
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
            style={{
              color: focusColors.borderColor,
            }}
          >
            <i className="ph ph-x-circle text-base" />
            <span>Clear focus</span>
          </button>
        </div>
      )}

      {!focusedDomain && (
        <div
          className="floating-panel absolute left-2 top-4 md:left-4"
          data-testid="stats-panel"
        >
          <h1 className="mb-1 text-sm font-semibold text-[var(--text-primary)]">
            Full Graph
          </h1>
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
