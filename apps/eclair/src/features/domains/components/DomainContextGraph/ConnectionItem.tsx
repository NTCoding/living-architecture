import type { AggregatedConnection } from '../../extractDomainDetails'

interface ConnectionItemProps {
  readonly connection: AggregatedConnection
  readonly currentDomainId: string
  readonly targetDomainId: string
}

export function ConnectionItem({ connection, currentDomainId, targetDomainId }: Readonly<ConnectionItemProps>): React.ReactElement {
  const isOutgoing = connection.direction === 'outgoing'
  const fromDomain = isOutgoing ? currentDomainId : targetDomainId
  const toDomain = isOutgoing ? targetDomainId : currentDomainId

  return (
    <div className="rounded-md bg-[var(--bg-tertiary)] p-3">
      <div className="mb-2 flex items-center gap-2 text-sm">
        <span className="font-medium text-[var(--text-primary)]">{fromDomain}</span>
        <i className={`ph ${isOutgoing ? 'ph-arrow-right' : 'ph-arrow-left'} text-[var(--text-tertiary)]`} aria-hidden="true" />
        <span className="font-medium text-[var(--text-primary)]">{toDomain}</span>
      </div>
      <div className="flex gap-3">
        {connection.apiCount > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-[var(--primary)]" />
            <span className="text-xs text-[var(--text-secondary)]">
              {connection.apiCount} API {connection.apiCount === 1 ? 'call' : 'calls'}
            </span>
          </div>
        )}
        {connection.eventCount > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-[var(--accent)]" />
            <span className="text-xs text-[var(--text-secondary)]">
              {connection.eventCount} {connection.eventCount === 1 ? 'event' : 'events'}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
