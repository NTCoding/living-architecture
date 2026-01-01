import { useCallback } from 'react'
import type { AggregatedConnection } from '../../extractDomainDetails'
import { ConnectionItem } from './ConnectionItem'

interface DomainInfoModalProps {
  readonly nodeId: string
  readonly connections: readonly AggregatedConnection[]
  readonly isCurrent: boolean
  readonly currentDomainId: string
  readonly onClose: () => void
}

export function DomainInfoModal({
  nodeId,
  connections,
  isCurrent,
  currentDomainId,
  onClose,
}: Readonly<DomainInfoModalProps>): React.ReactElement {
  const handleBackdropClick = useCallback(() => {
    onClose()
  }, [onClose])

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/20"
        onClick={handleBackdropClick}
        aria-hidden="true"
      />
      <div
        data-testid={`tooltip-${nodeId}`}
        role="dialog"
        aria-labelledby={`modal-title-${nodeId}`}
        className="absolute left-1/2 top-1/2 z-50 w-80 -translate-x-1/2 -translate-y-1/2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-xl"
      >
        <ModalHeader nodeId={nodeId} isCurrent={isCurrent} onClose={onClose} />
        <ModalContent isCurrent={isCurrent} connections={connections} currentDomainId={currentDomainId} />
        {!isCurrent && <ModalFooter nodeId={nodeId} />}
      </div>
    </>
  )
}

interface ModalHeaderProps {
  readonly nodeId: string
  readonly isCurrent: boolean
  readonly onClose: () => void
}

function ModalHeader({ nodeId, isCurrent, onClose }: Readonly<ModalHeaderProps>): React.ReactElement {
  return (
    <div className="flex items-center justify-between border-b border-[var(--border-color)] px-4 py-3">
      <div className="flex items-center gap-3">
        <div className={`flex h-8 w-8 items-center justify-center rounded-full ${isCurrent ? 'bg-[var(--primary)]' : 'bg-[var(--bg-tertiary)]'}`}>
          <i className={`ph ph-circles-three-plus text-sm ${isCurrent ? 'text-white' : 'text-[var(--text-secondary)]'}`} aria-hidden="true" />
        </div>
        <div>
          <h3 id={`modal-title-${nodeId}`} className="font-semibold text-[var(--text-primary)]">
            {nodeId}
          </h3>
          <span className="text-xs text-[var(--text-tertiary)]">
            {isCurrent ? 'Current domain' : 'Connected domain'}
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="flex h-6 w-6 items-center justify-center rounded text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
        aria-label="Close"
      >
        <i className="ph ph-x text-sm" aria-hidden="true" />
      </button>
    </div>
  )
}

interface ModalContentProps {
  isCurrent: boolean
  connections: AggregatedConnection[]
  currentDomainId: string
}

function ModalContent({ isCurrent, connections, currentDomainId }: Readonly<ModalContentProps>): React.ReactElement {
  const isCurrentDomain = isCurrent
  const hasNoConnections = connections.length === 0

  const renderContent = (): React.ReactElement => {
    if (isCurrentDomain) {
      return (
        <p className="text-sm text-[var(--text-secondary)]">
          This is the domain you are currently viewing.
        </p>
      )
    }
    if (hasNoConnections) {
      return (
        <p className="text-sm text-[var(--text-secondary)]">
          No direct connections to {currentDomainId}.
        </p>
      )
    }
    return (
      <div className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
          Connections
        </h4>
        {connections.map((conn) => (
          <ConnectionItem
            key={`${conn.direction}-${conn.targetDomain}`}
            connection={conn}
            currentDomainId={currentDomainId}
            targetDomainId={currentDomainId}
          />
        ))}
      </div>
    )
  }
  const content = renderContent()

  return (
    <div className="p-4">
      {content}
    </div>
  )
}

interface ModalFooterProps {
  readonly nodeId: string
}

function ModalFooter({ nodeId }: Readonly<ModalFooterProps>): React.ReactElement {
  return (
    <div className="border-t border-[var(--border-color)] px-4 py-3">
      <a
        href={`/domains/${nodeId}`}
        className="flex items-center justify-center gap-2 rounded-md bg-[var(--primary)] px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--primary-dark)]"
      >
        <i className="ph ph-arrow-right" aria-hidden="true" />
        View Domain Details
      </a>
    </div>
  )
}
