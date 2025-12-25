import { useMemo, useCallback, useEffect, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { ReactFlow, Background, Controls, useNodesState, useEdgesState } from '@xyflow/react'
import type { NodeTypes, Node, Edge, NodeMouseHandler, EdgeMouseHandler } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { RiviereGraph } from '@/types/riviere'
import { useExport } from '@/contexts/ExportContext'
import {
  generateExportFilename,
  exportElementAsPng,
  exportSvgAsFile,
  UNNAMED_GRAPH_EXPORT_NAME,
} from '@/lib/exportGraph'
import { extractDomainMapData, getConnectedDomains } from './extractDomainMapData'
import type { DomainNodeData, DomainEdgeData } from './extractDomainMapData'
import { DomainNode } from './components/DomainNode'
import { useDomainMapInteractions } from './hooks/useDomainMapInteractions'

interface DomainMapPageProps {
  graph: RiviereGraph
}

const nodeTypes: NodeTypes = { domain: DomainNode }

export function DomainMapPage({ graph }: DomainMapPageProps): React.ReactElement {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { registerExportHandlers, clearExportHandlers } = useExport()
  const exportContainerRef = useRef<HTMLDivElement>(null)
  const highlightDomain = searchParams.get('highlight')

  const { domainNodes: initialNodes, domainEdges: initialEdges } = useMemo(() => extractDomainMapData(graph), [graph])
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<DomainNodeData>>(initialNodes)
  const [edges, setEdges] = useEdgesState<Edge<DomainEdgeData>>(initialEdges)

  useEffect(() => {
    setNodes(initialNodes)
    setEdges(initialEdges)
  }, [initialNodes, initialEdges, setNodes, setEdges])

  const connectionText = initialEdges.length === 1 ? '1 connection' : `${initialEdges.length} connections`

  const nodeCountMap = useMemo(() => {
    const map = new Map<string, number>()
    for (const node of nodes) {
      map.set(node.id, node.data.nodeCount)
    }
    return map
  }, [nodes])

  const {
    tooltip,
    inspector,
    focusedDomain,
    showNodeTooltip,
    showEdgeTooltip,
    hideTooltip,
    selectEdge,
    closeInspector,
    clearFocus,
  } = useDomainMapInteractions({ initialFocusedDomain: highlightDomain })

  const onNodeMouseEnter: NodeMouseHandler<Node<DomainNodeData>> = useCallback((event, node) => {
    showNodeTooltip(event.clientX, event.clientY, node.data.label, node.data.nodeCount)
  }, [showNodeTooltip])

  const onNodeMouseLeave = useCallback(() => {
    hideTooltip()
  }, [hideTooltip])

  const onEdgeMouseEnter: EdgeMouseHandler<Edge<DomainEdgeData>> = useCallback((event, edge) => {
    if (edge.data === undefined) return
    showEdgeTooltip(
      event.clientX,
      event.clientY,
      edge.source,
      edge.target,
      edge.data.apiCount,
      edge.data.eventCount
    )
  }, [showEdgeTooltip])

  const onEdgeMouseLeave = useCallback(() => {
    hideTooltip()
  }, [hideTooltip])

  const onEdgeClick = useCallback((_event: React.MouseEvent, edge: Edge<DomainEdgeData>) => {
    if (edge.data === undefined) return
    const sourceNodeCount = nodeCountMap.get(edge.source)
    const targetNodeCount = nodeCountMap.get(edge.target)
    if (sourceNodeCount === undefined || targetNodeCount === undefined) {
      throw new Error(`Edge references missing node: source=${edge.source} target=${edge.target}`)
    }
    selectEdge(
      edge.source,
      edge.target,
      edge.data.apiCount,
      edge.data.eventCount,
      sourceNodeCount,
      targetNodeCount,
      edge.data.connections
    )
  }, [selectEdge, nodeCountMap])

  const onNodeClick: NodeMouseHandler<Node<DomainNodeData>> = useCallback((_event, node) => {
    navigate(`/domains/${node.id}`)
  }, [navigate])

  const connectedDomains = useMemo(() => {
    if (focusedDomain === null) return null
    return getConnectedDomains(focusedDomain, edges)
  }, [focusedDomain, edges])

  const styledNodes = useMemo(() => {
    if (focusedDomain === null) return nodes
    return nodes.map((node) => {
      const isFocused = node.id === focusedDomain
      const isConnected = connectedDomains?.has(node.id) ?? false
      const isDimmed = !isFocused && !isConnected
      return {
        ...node,
        data: { ...node.data, dimmed: isDimmed },
      }
    })
  }, [nodes, focusedDomain, connectedDomains])

  const styledEdges = useMemo(() => {
    if (focusedDomain === null) return edges
    return edges.map((edge) => {
      const isRelevant = edge.source === focusedDomain || edge.target === focusedDomain
      return {
        ...edge,
        style: { ...edge.style, opacity: isRelevant ? 1 : 0.2 },
      }
    })
  }, [edges, focusedDomain])

  const totalConnections = inspector.apiCount + inspector.eventCount

  useEffect(() => {
    const graphName = graph.metadata.name ?? UNNAMED_GRAPH_EXPORT_NAME

    const handleExportPng = (): void => {
      if (exportContainerRef.current) {
        const filename = generateExportFilename(graphName, 'png')
        const backgroundColor = getComputedStyle(document.documentElement)
          .getPropertyValue('--bg-primary')
          .trim()
        void exportElementAsPng(exportContainerRef.current, filename, { backgroundColor })
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

  return (
    <div ref={exportContainerRef} data-testid="domain-map-page" className="relative h-full w-full">
      <div data-testid="domain-map-flow" className="h-full w-full">
        <ReactFlow
          nodes={styledNodes}
          edges={styledEdges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onNodeMouseEnter={onNodeMouseEnter}
          onNodeMouseLeave={onNodeMouseLeave}
          onNodeClick={onNodeClick}
          onEdgeMouseEnter={onEdgeMouseEnter}
          onEdgeMouseLeave={onEdgeMouseLeave}
          onEdgeClick={onEdgeClick}
          onPaneClick={clearFocus}
          fitView
        >
          <Background />
          <Controls />
          <svg>
            <defs>
              <marker
                id="arrow-cyan"
                viewBox="0 0 10 10"
                refX="10"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#06B6D4" />
              </marker>
              <marker
                id="arrow-amber"
                viewBox="0 0 10 10"
                refX="10"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#F59E0B" />
              </marker>
            </defs>
          </svg>
        </ReactFlow>
      </div>

      <div className="floating-panel absolute left-2 top-4 md:left-4">
        <h1 className="mb-1 text-sm font-semibold text-[var(--text-primary)]">Domain Map</h1>
        <div className="flex flex-wrap gap-2 text-xs text-[var(--text-secondary)] md:gap-4">
          <span>{initialNodes.length} domains</span>
          <span>{connectionText}</span>
        </div>
      </div>

      {tooltip.visible && (
        <div
          data-testid="domain-map-tooltip"
          className="pointer-events-none fixed z-50 rounded-md border border-[var(--border-primary)] bg-[var(--bg-primary)] px-3 py-2 shadow-lg"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <div className="text-sm font-semibold text-[var(--text-primary)]">{tooltip.title}</div>
          <div className="text-xs text-[var(--text-secondary)]">{tooltip.detail}</div>
        </div>
      )}

      <div
        data-testid="domain-map-inspector"
        className={`absolute right-0 top-0 h-full border-l border-[var(--border-primary)] bg-[var(--bg-primary)] transition-all duration-200 ${
          inspector.visible ? 'w-full md:w-80' : 'w-0 overflow-hidden'
        }`}
      >
        <div className="flex items-center justify-between border-b border-[var(--border-primary)] p-4">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Integration Details</h2>
          <button
            onClick={closeInspector}
            className="flex h-7 w-7 items-center justify-center rounded text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] hover:text-[var(--text-primary)]"
            aria-label="Close inspector"
          >
            ×
          </button>
        </div>

        <div className="space-y-5 p-5">
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
              Integration
            </div>
            <div className="text-sm text-[var(--text-primary)]">
              <span className="font-semibold">{inspector.source}</span>
              {' → '}
              <span className="font-semibold">{inspector.target}</span>
            </div>
          </div>

          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
              Total Connections
            </div>
            <div className="text-sm text-[var(--text-primary)]">{totalConnections}</div>
          </div>

          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
              Connections
            </div>
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {inspector.connections.map((conn, index) => {
                const isEvent = conn.targetNodeType === 'EventHandler'
                return (
                  <div
                    key={`${conn.sourceName}-${conn.targetName}-${index}`}
                    className="rounded-md border border-[var(--border-primary)] bg-[var(--surface-secondary)] p-3"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-semibold ${
                          isEvent ? 'bg-amber-100 text-amber-700' : 'bg-cyan-100 text-cyan-700'
                        }`}
                      >
                        {isEvent ? 'EVENT' : 'API'}
                      </span>
                    </div>
                    <div className="mt-2 text-sm text-[var(--text-primary)]">
                      {conn.sourceName}
                    </div>
                    <div className="text-xs text-[var(--text-secondary)]">
                      → {conn.targetName}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
              Source Domain
            </div>
            <div className="text-sm text-[var(--text-primary)]">{inspector.source}</div>
            <div className="text-xs text-[var(--text-secondary)]">{inspector.sourceNodeCount} components</div>
          </div>

          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
              Target Domain
            </div>
            <div className="text-sm text-[var(--text-primary)]">{inspector.target}</div>
            <div className="text-xs text-[var(--text-secondary)]">{inspector.targetNodeCount} components</div>
          </div>
        </div>
      </div>
    </div>
  )
}
