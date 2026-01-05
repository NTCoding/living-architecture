import {
  useEffect, useId 
} from 'react'
import type { DomainDetails } from '../../extractDomainDetails'
import { NodeTypeBadge } from '@/features/flows/components/NodeTypeBadge/NodeTypeBadge'

interface DomainDetailModalProps {
  readonly domain: DomainDetails | null
  readonly onClose: () => void
}

export function DomainDetailModal({
  domain, onClose 
}: Readonly<DomainDetailModalProps>): React.ReactElement | null {
  const titleId = useId()

  useEffect(() => {
    if (domain === null) {
      return
    }

    function handleKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [domain, onClose])

  if (domain === null) {
    return null
  }

  const hasEvents = domain.events.published.length > 0 || domain.events.consumed.length > 0

  return (
    <div className="domain-detail-modal active" role="dialog" aria-labelledby={titleId} aria-modal="true">
      <div
        data-testid="modal-backdrop"
        className="domain-detail-backdrop"
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            onClose()
          }
        }}
        role="button"
        tabIndex={-1}
        aria-label="Close modal"
      />
      <div className="domain-detail-panel">
        <div className="domain-detail-header">
          <h2 id={titleId} className="domain-detail-title">
            {domain.id}
          </h2>
          <button
            type="button"
            className="domain-detail-close"
            onClick={onClose}
            aria-label="Close"
          >
            <i className="ph ph-x" aria-hidden="true" />
          </button>
        </div>

        <div className="domain-detail-body">
          <div className="domain-detail-section">
            <div className="domain-detail-section-title">Description</div>
            <p className="domain-detail-description">{domain.description}</p>
          </div>

          <div className="domain-detail-section">
            <div className="domain-detail-section-title">Nodes</div>
            {domain.nodes.length > 0 ? (
              <div className="domain-nodes-list">
                {domain.nodes.map((node) => (
                  <div key={node.id} className="domain-node-item">
                    <div className="domain-node-info">
                      <NodeTypeBadge type={node.type} />
                      <span className="domain-node-name">{node.name}</span>
                    </div>
                    {node.location !== undefined && (
                      <a href="#" className="code-link code-link-responsive" style={{ fontSize: '11px' }}>
                        <i className="ph ph-code" aria-hidden="true" />
                        <span className="code-link-text">{node.location}</span>
                      </a>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                fontSize: '12px',
                color: 'var(--text-tertiary)',
                fontStyle: 'italic' 
              }}>
                No nodes in this domain
              </div>
            )}
          </div>

          <div className="domain-detail-section">
            <div className="domain-detail-section-title">Entities</div>
            {domain.entities.length > 0 ? (
              <div className="domain-entities-ops">
                {domain.entities.map((entity) => (
                  <div key={entity.name} className="domain-entity-block">
                    <div className="domain-entity-name">{entity.name}</div>
                    <div className="domain-entity-ops-list">
                      {entity.operations.map((op) => (
                        <span key={op} className="domain-entity-op">
                          {op}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                fontSize: '12px',
                color: 'var(--text-tertiary)',
                fontStyle: 'italic' 
              }}>
                No entities in this domain
              </div>
            )}
          </div>

          <div className="domain-detail-section">
            <div className="domain-detail-section-title">Events</div>
            {hasEvents ? (
              <div className="domain-events-pubsub">
                {domain.events.published.length > 0 && (
                  <>
                    <div className="domain-event-role">Published</div>
                    {domain.events.published.map((evt) => (
                      <div key={evt.id} className="domain-event-block">
                        <span className="badge-event">EVENT</span>
                        <span className="domain-event-name">{evt.eventName}</span>
                      </div>
                    ))}
                  </>
                )}
                {domain.events.consumed.length > 0 && (
                  <>
                    <div className="domain-event-role">Consumed</div>
                    {domain.events.consumed.map((handler) => (
                      <div key={handler.id} className="domain-event-block">
                        <span className="badge-handler">HANDLER</span>
                        <span className="domain-event-name">{handler.handlerName}</span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            ) : (
              <div style={{
                fontSize: '12px',
                color: 'var(--text-tertiary)',
                fontStyle: 'italic' 
              }}>
                No events in this domain
              </div>
            )}
          </div>

          <div className="domain-detail-section">
            <div className="domain-detail-section-title">Cross-Domain Connections</div>
            {domain.crossDomainEdges.length > 0 ? (
              <div className="domain-edges-list">
                {domain.crossDomainEdges.map((edge) => (
                  <div key={`${edge.targetDomain}-${edge.edgeType ?? 'unknown'}`} className="domain-edge-item">
                    <span style={{
                      fontSize: '12px',
                      color: 'var(--text-secondary)' 
                    }}>{domain.id}</span>
                    <span className="domain-edge-arrow">{edge.edgeType === 'sync' ? '→' : '⇢'}</span>
                    <span className="domain-edge-target">{edge.targetDomain}</span>
                    <span style={{
                      fontSize: '11px',
                      color: 'var(--text-tertiary)' 
                    }}>{edge.edgeType ?? 'unknown'}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                fontSize: '12px',
                color: 'var(--text-tertiary)',
                fontStyle: 'italic' 
              }}>
                No cross-domain connections
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
