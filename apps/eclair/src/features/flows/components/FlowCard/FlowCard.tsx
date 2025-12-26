import { useNavigate } from 'react-router-dom'
import type { RiviereGraph } from '@/types/riviere'
import type { Flow } from '../../extractFlows'
import { CodeLinkMenu } from '../CodeLinkMenu/CodeLinkMenu'
import { FlowTrace } from '../FlowTrace/FlowTrace'
import { NodeTypeBadge } from '../NodeTypeBadge/NodeTypeBadge'

interface FlowCardProps {
  flow: Flow
  graph: RiviereGraph
  expanded: boolean
  onToggle: () => void
}

export function FlowCard({ flow, graph, expanded, onToggle }: FlowCardProps): React.ReactElement {
  const navigate = useNavigate()
  const { entryPoint } = flow
  const hasSourceLocation = entryPoint.sourceLocation !== undefined

  function handleViewOnGraph(e: React.MouseEvent): void {
    e.stopPropagation()
    navigate(`/full-graph?node=${entryPoint.id}`)
  }

  return (
    <div data-testid="flow-card" className="flow-item">
      <div
        data-testid="flow-card-header"
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onToggle()
          }
        }}
        role="button"
        tabIndex={0}
        className="flow-item-header"
      >
        <div data-testid="flow-item-left" className="flow-item-left">
          <NodeTypeBadge type={entryPoint.type} />
          <span className="flow-item-title">{entryPoint.name}</span>
          <span className="flow-item-domain">{entryPoint.domain}</span>
        </div>
        <div data-testid="flow-item-actions" className="flow-item-actions">
          {hasSourceLocation && entryPoint.sourceLocation !== undefined && entryPoint.sourceLocation.lineNumber !== undefined && (
            <CodeLinkMenu
              filePath={entryPoint.sourceLocation.filePath}
              lineNumber={entryPoint.sourceLocation.lineNumber}
              repository={entryPoint.sourceLocation.repository}
            />
          )}
          <button
            type="button"
            className="graph-link-btn"
            title="View on Full Graph"
            onClick={handleViewOnGraph}
          >
            <i className="ph ph-graph" aria-hidden="true" />
            View on Graph
          </button>
          <i
            data-testid="flow-card-chevron"
            className={`ph ph-caret-down text-[var(--text-tertiary)] transition-transform ${expanded ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </div>
      </div>
      {expanded && <FlowTrace steps={flow.steps} graph={graph} />}
    </div>
  )
}
