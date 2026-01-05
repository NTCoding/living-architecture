import {
 useMemo, useState, useCallback 
} from 'react'
import {
 ReactFlow, Background, Controls 
} from '@xyflow/react'
import type {
 Node, Edge, EdgeMouseHandler 
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import dagre from 'dagre'
import type {
 DomainConnectionDiffResult, DomainConnection, EdgeDetail 
} from './computeDomainConnectionDiff'
import { DomainNode } from '../domain-map/components/DomainNode/DomainNode'
import { getClosestHandle } from '@/lib/handlePositioning'

interface DomainConnectionDiffProps {readonly diff: DomainConnectionDiffResult}

type ConnectionStatus = 'added' | 'removed' | 'unchanged'

interface DiffNodeData extends Record<string, unknown> {
  label: string
  nodeCount: number
  dimmed?: boolean
}

interface DiffEdgeData extends Record<string, unknown> {
  status: ConnectionStatus
  sourceDomain: string
  targetDomain: string
  edges: EdgeDetail[]
}

const nodeTypes = { domain: DomainNode }

const STATUS_COLORS = {
  added: '#1A7F37',
  removed: '#FF6B6B',
  unchanged: 'var(--border-color)',
}

function computeDagreLayout(
  domainIds: string[],
  edges: Array<{
 source: string;
target: string 
}>
): Map<string, {
 x: number;
y: number 
}> {
  const layoutGraph = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}))

  layoutGraph.setGraph({
    rankdir: 'LR',
    nodesep: 40,
    ranksep: 80,
    marginx: 20,
    marginy: 20,
  })

  for (const domainId of domainIds) {
    layoutGraph.setNode(domainId, {
 width: 80,
height: 80 
})
  }

  for (const edge of edges) {
    layoutGraph.setEdge(edge.source, edge.target)
  }

  dagre.layout(layoutGraph)

  const positions = new Map<string, {
 x: number;
y: number 
}>()
  for (const domainId of domainIds) {
    const node = layoutGraph.node(domainId)
    positions.set(domainId, {
 x: node.x,
y: node.y 
})
  }

  return positions
}

function buildNodes(
  domains: string[],
  positions: Map<string, {
 x: number;
y: number 
}>,
  domainsWithChanges: Set<string>
): Node<DiffNodeData>[] {
  return domains.map((domain) => {
    const position = positions.get(domain)
    if (position === undefined) {
      throw new Error(`Domain ${domain} missing from layout computation`)
    }
    const hasChanges = domainsWithChanges.has(domain)
    return {
      id: domain,
      type: 'domain',
      position,
      data: {
 label: domain,
nodeCount: 0,
dimmed: !hasChanges 
},
    }
  })
}

function buildEdges(
  connections: DomainConnection[],
  status: ConnectionStatus,
  positions: Map<string, {
 x: number;
y: number 
}>
): Edge<DiffEdgeData>[] {
  return connections.map((conn) => {
    const sourcePos = positions.get(conn.source)
    const targetPos = positions.get(conn.target)
    if (sourcePos === undefined || targetPos === undefined) {
      throw new Error(`Edge references missing position: ${conn.source} -> ${conn.target}`)
    }
    const handles = getClosestHandle(sourcePos, targetPos)
    const color = STATUS_COLORS[status]
    const opacity = status === 'unchanged' ? 0.5 : 1

    return {
      id: `${conn.source}->${conn.target}`,
      source: conn.source,
      target: conn.target,
      sourceHandle: handles.sourceHandle,
      targetHandle: handles.targetHandle,
      data: {
 status,
sourceDomain: conn.source,
targetDomain: conn.target,
edges: conn.edges 
},
      style: {
 stroke: color,
strokeWidth: status === 'unchanged' ? 2 : 3,
opacity,
cursor: 'pointer' 
},
      animated: false,
      interactionWidth: 20,
    }
  })
}

function Legend({ className }: { readonly className?: string }): React.ReactElement {
  const classNameString = className === undefined ? '' : ` ${className}`
  const divClassName = `flex flex-col gap-2 rounded-md border border-[var(--border-color)] bg-[var(--bg-primary)] p-3 text-xs${classNameString}`
  return (
    <div className={divClassName}>
      <div className="flex items-center gap-2">
        <div className="h-0.5 w-4" style={{ backgroundColor: STATUS_COLORS.added }} />
        <span>Added</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-0.5 w-4" style={{ backgroundColor: STATUS_COLORS.removed }} />
        <span>Removed</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-0.5 w-4 opacity-50" style={{ backgroundColor: 'var(--text-secondary)' }} />
        <span>Unchanged</span>
      </div>
    </div>
  )
}

interface TooltipData {
  x: number
  y: number
  status: ConnectionStatus
  sourceDomain: string
  targetDomain: string
  edges: EdgeDetail[]
}

interface EdgeTooltipProps {readonly data: TooltipData}

function EdgeTooltip({ data }: Readonly<EdgeTooltipProps>): React.ReactElement {
  const statusLabel = {
    added: 'Added Connection',
    removed: 'Removed Connection',
    unchanged: 'Unchanged Connection',
  }[data.status]

  const statusColor = STATUS_COLORS[data.status]

  return (
    <div
      data-testid="edge-tooltip"
      className="pointer-events-none fixed z-50 max-w-xs rounded-md border border-[var(--border-color)] bg-[var(--bg-primary)] p-3 shadow-lg"
      style={{
 left: data.x + 10,
top: data.y + 10 
}}
    >
      <div className="mb-2 flex items-center gap-2">
        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: statusColor }} />
        <span className="text-xs font-semibold uppercase" style={{ color: statusColor }}>
          {statusLabel}
        </span>
      </div>
      <div className="mb-2 text-sm font-semibold text-[var(--text-primary)]">
        {data.sourceDomain} → {data.targetDomain}
      </div>
      {data.edges.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs font-semibold uppercase text-[var(--text-tertiary)]">Edges</div>
          <ul className="space-y-0.5 text-xs text-[var(--text-secondary)]">
            {data.edges.slice(0, 5).map((edge, index) => (
              <li key={index} className="flex items-center gap-1">
                <span className="text-[var(--text-tertiary)]">
                  {edge.type === 'async' ? '⚡' : '→'}
                </span>
                {edge.sourceNodeName} → {edge.targetNodeName}
              </li>
            ))}
            {data.edges.length > 5 && (
              <li className="text-[var(--text-tertiary)]">
                +{data.edges.length - 5} more
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}

interface FullscreenModalProps {
  readonly nodes: readonly Node<DiffNodeData>[]
  readonly edges: readonly Edge<DiffEdgeData>[]
  readonly onClose: () => void
  readonly onEdgeMouseEnter: EdgeMouseHandler<Edge<DiffEdgeData>>
  readonly onEdgeMouseLeave: () => void
  readonly tooltip: TooltipData | null
}

function FullscreenModal({
 nodes, edges, onClose, onEdgeMouseEnter, onEdgeMouseLeave, tooltip 
}: Readonly<FullscreenModalProps>): React.ReactElement {
  return (
    <div
      role="dialog"
      aria-label="Domain Connection Changes"
      aria-modal="true"
      className="fixed inset-0 z-50 flex flex-col bg-[var(--bg-primary)]"
    >
      <div className="flex items-center justify-between border-b border-[var(--border-color)] px-4 py-3">
        <h2 className="text-lg font-bold text-[var(--text-primary)]">Domain Connection Changes</h2>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
          aria-label="Close modal"
        >
          <i className="ph ph-x text-lg" aria-hidden="true" />
        </button>
      </div>
      <div className="relative flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          proOptions={{ hideAttribution: true }}
          onEdgeMouseEnter={onEdgeMouseEnter}
          onEdgeMouseLeave={onEdgeMouseLeave}
        >
          <Background />
          <Controls showInteractive={false} className="!left-4 !bottom-4" />
        </ReactFlow>
        <Legend className="absolute left-4 top-4 z-10" />
        {tooltip !== null && <EdgeTooltip data={tooltip} />}
      </div>
    </div>
  )
}

function collectDomainsWithChanges(connections: DomainConnectionDiffResult['connections']): Set<string> {
  const domains = new Set<string>()
  for (const conn of connections.added) {
    domains.add(conn.source)
    domains.add(conn.target)
  }
  for (const conn of connections.removed) {
    domains.add(conn.source)
    domains.add(conn.target)
  }
  return domains
}

export function DomainConnectionDiff({ diff }: DomainConnectionDiffProps): React.ReactElement {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [tooltip, setTooltip] = useState<TooltipData | null>(null)

  const positions = useMemo(() => {
    const allEdges = [
      ...diff.connections.added.map((c) => ({
 source: c.source,
target: c.target 
})),
      ...diff.connections.removed.map((c) => ({
 source: c.source,
target: c.target 
})),
      ...diff.connections.unchanged.map((c) => ({
 source: c.source,
target: c.target 
})),
    ]
    return computeDagreLayout(diff.domains, allEdges)
  }, [diff.domains, diff.connections])

  const domainsWithChanges = useMemo(
    () => collectDomainsWithChanges(diff.connections),
    [diff.connections]
  )

  const nodes = useMemo(
    () => buildNodes(diff.domains, positions, domainsWithChanges),
    [diff.domains, positions, domainsWithChanges]
  )

  const edges = useMemo(() => [
    ...buildEdges(diff.connections.unchanged, 'unchanged', positions),
    ...buildEdges(diff.connections.removed, 'removed', positions),
    ...buildEdges(diff.connections.added, 'added', positions),
  ], [diff.connections, positions])

  const handleEdgeMouseEnter: EdgeMouseHandler<Edge<DiffEdgeData>> = useCallback((event, edge) => {
    if (edge.data === undefined) return
    setTooltip({
      x: event.clientX,
      y: event.clientY,
      status: edge.data.status,
      sourceDomain: edge.data.sourceDomain,
      targetDomain: edge.data.targetDomain,
      edges: edge.data.edges,
    })
  }, [])

  const handleEdgeMouseLeave = useCallback(() => {
    setTooltip(null)
  }, [])

  return (
    <>
      <div data-testid="domain-connection-diff" className="relative h-[400px] w-full rounded-[var(--radius)] border border-[var(--border-color)]">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          proOptions={{ hideAttribution: true }}
          onEdgeMouseEnter={handleEdgeMouseEnter}
          onEdgeMouseLeave={handleEdgeMouseLeave}
        >
          <Background />
          <Controls showInteractive={false} className="!left-4 !bottom-4" />
        </ReactFlow>
        <Legend className="absolute left-4 top-4 z-10" />
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
          aria-label="Expand diagram"
        >
          <i className="ph ph-arrows-out text-lg" aria-hidden="true" />
        </button>
        {tooltip !== null && <EdgeTooltip data={tooltip} />}
      </div>
      {isModalOpen && (
        <FullscreenModal
          nodes={nodes}
          edges={edges}
          onClose={() => setIsModalOpen(false)}
          onEdgeMouseEnter={handleEdgeMouseEnter}
          onEdgeMouseLeave={handleEdgeMouseLeave}
          tooltip={tooltip}
        />
      )}
    </>
  )
}
