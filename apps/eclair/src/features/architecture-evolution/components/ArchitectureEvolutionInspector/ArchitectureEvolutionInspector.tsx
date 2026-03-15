import type { Edge } from '@xyflow/react'
import type { ArchitectureEvolutionEdgeData } from '../../data/architecture-evolution-scenario'

interface ArchitectureEvolutionInspectorProps {
  readonly selectedEdge: Edge<ArchitectureEvolutionEdgeData> | null
  readonly nodeLabelById: ReadonlyMap<string, string>
  readonly onClose: () => void
}

function getEdgeKindBadgeClassName(kind: ArchitectureEvolutionEdgeData['kind']): string {
  if (kind === 'query') return 'arch-evo-inspector-badge arch-evo-inspector-badge--read'
  if (kind === 'event') return 'arch-evo-inspector-badge arch-evo-inspector-badge--event'
  return 'arch-evo-inspector-badge arch-evo-inspector-badge--write'
}

export function ArchitectureEvolutionInspector({
  selectedEdge,
  nodeLabelById,
  onClose,
}: ArchitectureEvolutionInspectorProps): React.ReactElement {
  return (
    <div
      data-testid="arch-evolution-inspector"
      className={`inspector-panel ${selectedEdge === null ? 'inspector-panel-collapsed' : 'inspector-panel-expanded'}`}
    >
      {selectedEdge?.data !== undefined && (
        <>
          <div className="inspector-header">
            <div className="inspector-title">
              <i className="ph ph-line-segment" aria-hidden="true" />
              <span>Connection Details</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inspector-close"
              aria-label="Close inspector"
            >
              <i className="ph ph-x" aria-hidden="true" />
            </button>
          </div>

          <div className="inspector-body">
            <div className="inspector-section">
              <div className="flex flex-wrap items-center gap-2">
                <span className={getEdgeKindBadgeClassName(selectedEdge.data.kind)}>
                  {selectedEdge.data.kind}
                </span>
                {selectedEdge.data.transition !== 'unchanged' && (
                  <span className="arch-evo-inspector-transition">
                    {selectedEdge.data.transition}
                  </span>
                )}
              </div>
            </div>

            <div className="inspector-section">
              <div className="inspector-section-title">Contract</div>
              <div className="inspector-domain-info">{selectedEdge.data.label}</div>
              <div className="inspector-domain-meta">{selectedEdge.data.subtitle}</div>
            </div>

            <div className="inspector-section">
              <div className="inspector-section-title">Flow</div>
              <div className="inspector-integration-flow">
                <span className="inspector-integration-flow-domain">
                  {nodeLabelById.get(selectedEdge.source) ?? selectedEdge.source}
                </span>
                {' -> '}
                <span className="inspector-integration-flow-domain">
                  {nodeLabelById.get(selectedEdge.target) ?? selectedEdge.target}
                </span>
              </div>
            </div>

            <div className="inspector-section">
              <div className="inspector-section-title">Source Interface</div>
              <div className="inspector-domain-info">{selectedEdge.data.sourcePortLabel}</div>
            </div>

            <div className="inspector-section">
              <div className="inspector-section-title">Target Interface</div>
              <div className="inspector-domain-info">{selectedEdge.data.targetPortLabel}</div>
            </div>

            <div className="inspector-section">
              <div className="inspector-section-title">Meaning</div>
              <div className="text-sm text-[var(--text-secondary)]">
                {selectedEdge.data.description}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
