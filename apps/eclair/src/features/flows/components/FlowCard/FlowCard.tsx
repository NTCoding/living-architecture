import { useNavigate } from 'react-router-dom'
import type { RiviereGraph } from '@living-architecture/riviere-schema-published-language/schema'
import type { Flow } from '../../queries/extract-flows'
import { CodeLinkMenu } from '@/platform/infra/ui/CodeLinkMenu/CodeLinkMenu'
import { FlowTrace } from '../FlowTrace/FlowTrace'
import { NodeTypeBadge } from '@/platform/infra/ui/NodeTypeBadge/NodeTypeBadge'
import { getNodeTypeDescription } from '@/platform/domain/node-type-presentation'
import type { Theme } from '@/types/theme'
import { DEFAULT_THEME } from '@/types/theme'

interface FlowCardProps {
  readonly flow: Flow
  readonly graph: RiviereGraph
  readonly expanded: boolean
  readonly onToggle: () => void
  readonly theme?: Theme
}

export function FlowCard({
  flow,
  graph,
  expanded,
  onToggle,
  theme = DEFAULT_THEME,
}: Readonly<FlowCardProps>): React.ReactElement {
  const navigate = useNavigate()
  const { entryPoint } = flow

  function handleViewOnGraph(e: React.MouseEvent): void {
    e.stopPropagation()
    void navigate(`/full-graph?node=${entryPoint.id}`)
  }

  return (
    <div data-testid="flow-card" className="flow-item">
      <div className="flow-item-header">
        <button
          type="button"
          data-testid="flow-card-header"
          onClick={onToggle}
          className="flow-item-toggle"
          aria-expanded={expanded}
        >
          <div data-testid="flow-item-left" className="flow-item-left">
            <NodeTypeBadge
              type={entryPoint.type}
              description={getNodeTypeDescription(graph, entryPoint.type)}
              theme={theme}
            />
            <span className="flow-item-title" title={entryPoint.name}>
              {entryPoint.name}
            </span>
            <span className="flow-item-domain">{entryPoint.domain}</span>
          </div>
          <i
            data-testid="flow-card-chevron"
            className={`ph ph-caret-down flow-item-chevron ${expanded ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </button>
        <div data-testid="flow-item-actions" className="flow-item-actions">
          {entryPoint.sourceLocation?.lineNumber !== undefined && (
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
            aria-label="View on Full Graph"
            onClick={handleViewOnGraph}
          >
            <i className="ph ph-graph" aria-hidden="true" />
          </button>
        </div>
      </div>
      {expanded && <FlowTrace steps={flow.steps} graph={graph} theme={theme} />}
    </div>
  )
}
