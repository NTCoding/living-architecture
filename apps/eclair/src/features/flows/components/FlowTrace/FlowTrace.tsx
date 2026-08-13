import { useState } from 'react'
import type { FlowStep } from '../../queries/extract-flows'
import type { RiviereGraph } from '@living-architecture/riviere-schema/schema'
import { LinkId } from '@living-architecture/riviere-schema/link-id'
import { FlowGraphView } from './FlowGraphView'
import { getNodeTypeColor } from '@/platform/domain/node-type-presentation'
import type { Theme } from '@/types/theme'
import { DEFAULT_THEME } from '@/types/theme'
import { relationshipDetail } from '@/platform/domain/relationship-presentation'

type ViewMode = 'waterfall' | 'graph'

interface FlowTraceProps {
  readonly steps: readonly FlowStep[]
  readonly graph: RiviereGraph
  readonly theme?: Theme
}

const CIRCLE_CLASSES: Readonly<Record<string, string>> = {
  UI: 'flow-step-circle-ui',
  API: 'flow-step-circle-api',
  UseCase: 'flow-step-circle-usecase',
  DomainOp: 'flow-step-circle-domainop',
  Event: 'flow-step-circle-event',
  EventHandler: 'flow-step-circle-eventhandler',
  Custom: 'flow-step-circle-custom',
  External: 'flow-step-circle-external',
}

function getCircleTypeClass(type: string): string {
  return CIRCLE_CLASSES[type] ?? 'flow-step-circle-custom'
}

export function FlowTrace({
  steps, graph, theme = DEFAULT_THEME,
}: Readonly<FlowTraceProps>): React.ReactElement {
  const [viewMode, setViewMode] = useState<ViewMode>('waterfall')
  const componentNames = new Map(graph.components.map((component) => [component.id, component.name]))

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
                <div
                  className={`flow-step-circle ${getCircleTypeClass(step.node.type)}`}
                  style={{ backgroundColor: getNodeTypeColor(step.node.type, theme) }}
                >
                  {index + 1}
                </div>
                <div className="flow-step-content">
                  <div className="flow-step-name" title={step.node.name}>
                    {step.node.name}
                  </div>
                  <dl className="flow-step-meta">
                    <div className="flow-step-meta-item">
                      <dt>Module</dt>
                      <dd>{step.node.module}</dd>
                    </div>
                    <div className="flow-step-meta-item">
                      <dt>Domain</dt>
                      <dd>{step.node.domain}</dd>
                    </div>
                    <div className="flow-step-meta-item">
                      <dt>Type</dt>
                      <dd>{step.node.type}</dd>
                    </div>
                  </dl>
                  {step.node.subscribedEvents !== undefined &&
                    step.node.subscribedEvents.length > 0 && (
                    <div className="flow-step-subscribed-events">
                      Handles: {step.node.subscribedEvents.join(', ')}
                    </div>
                  )}
                </div>
                {(step.outgoingLinks?.length ?? 0) > 0 && (
                  <div className="flow-step-edge">
                    {step.outgoingLinks?.map((link) => (
                      <div key={link.id ?? LinkId.parseFromLink(link).toString()}>
                        {relationshipDetail(link)} → {componentNames.get(link.target) ?? link.target}
                      </div>
                    ))}
                  </div>
                )}
                {step.outgoingLinks === undefined && step.edgeType !== null &&
                  step.edgeType !== undefined && (
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
                        <div className="flow-step-meta">External · {extLink.type ?? 'sync'}</div>
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
          <FlowGraphView steps={steps} graph={graph} theme={theme} />
        </div>
      )}
    </div>
  )
}
