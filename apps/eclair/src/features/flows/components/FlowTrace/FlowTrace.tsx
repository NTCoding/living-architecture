import { useState } from 'react'
import type { FlowStep } from '../../extractFlows'
import type { NodeType, RiviereGraph } from '@/types/riviere'
import { FlowGraphView } from './FlowGraphView'

type ViewMode = 'waterfall' | 'graph'

interface FlowTraceProps {
  readonly steps: readonly FlowStep[]
  readonly graph: RiviereGraph
}

function getCircleTypeClass(nodeType: NodeType): string {
  const typeClassMap: Record<NodeType, string> = {
    UI: 'flow-step-circle-ui',
    API: 'flow-step-circle-api',
    UseCase: 'flow-step-circle-usecase',
    DomainOp: 'flow-step-circle-domainop',
    Event: 'flow-step-circle-event',
    EventHandler: 'flow-step-circle-eventhandler',
    Custom: 'flow-step-circle-custom',
    External: 'flow-step-circle-external',
  }
  return typeClassMap[nodeType]
}

export function FlowTrace({ steps, graph }: Readonly<FlowTraceProps>): React.ReactElement {
  const [viewMode, setViewMode] = useState<ViewMode>('waterfall')

  if (steps.length === 0) {
    return (
      <div data-testid="flow-trace" className="flow-trace-container">
        No steps in this flow
      </div>
    )
  }

  return (
    <div data-testid="flow-trace" className="flow-trace-container">
      <div className="flow-trace-header">
        <div className="flow-trace-header-label">FLOW TRACE</div>
        <div className="view-mode-switcher">
          <button
            type="button"
            className={`view-mode-btn ${viewMode === 'waterfall' ? 'active' : ''}`}
            onClick={() => setViewMode('waterfall')}
          >
            Waterfall
          </button>
          <button
            type="button"
            className={`view-mode-btn ${viewMode === 'graph' ? 'active' : ''}`}
            onClick={() => setViewMode('graph')}
          >
            Graph
          </button>
        </div>
      </div>

      {viewMode === 'waterfall' && (
        <div className="flow-waterfall-view">
          {steps.map((step, index) => (
            <div key={step.node.id}>
              <div className="flow-step">
                <div className={`flow-step-circle ${getCircleTypeClass(step.node.type)}`}>
                  {index + 1}
                </div>
                <div className="flow-step-content">
                  <div className="flow-step-name" title={step.node.name}>{step.node.name}</div>
                  <div className="flow-step-meta">
                    {step.node.module} · {step.node.domain} · {step.node.type}
                  </div>
                </div>
                {step.edgeType !== null && (
                  <div className="flow-step-edge">{step.edgeType} →</div>
                )}
              </div>
              {step.externalLinks.length > 0 && (
                <div className="flow-external-links">
                  {step.externalLinks.map((extLink) => (
                    <div key={extLink.target.name} className="flow-step flow-step-external">
                      <div className="flow-step-circle flow-step-circle-external">
                        <i className="ph ph-arrow-square-out" aria-hidden="true" />
                      </div>
                      <div className="flow-step-content">
                        <div className="flow-step-name">{extLink.target.name}</div>
                        <div className="flow-step-meta">
                          External · {extLink.type ?? 'sync'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {viewMode === 'graph' && (
        <div data-testid="flow-graph-view" className="flow-graph-view">
          <FlowGraphView steps={steps} graph={graph} />
        </div>
      )}
    </div>
  )
}
