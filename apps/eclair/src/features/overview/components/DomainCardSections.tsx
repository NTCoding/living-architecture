const DISPLAY_LIMIT = 3

interface EntitiesSectionProps {readonly entities: readonly string[]}

export function EntitiesSection({ entities }: Readonly<EntitiesSectionProps>): React.ReactElement {
  const displayedEntities = entities.slice(0, DISPLAY_LIMIT)
  const hasMore = entities.length > DISPLAY_LIMIT

  return (
    <div className="mb-3 border-b border-[var(--border-color)] pb-3">
      <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[var(--text-tertiary)]">
        Entities
      </h4>
      <div className="flex flex-wrap gap-1.5">
        {displayedEntities.map((entity) => (
          <span
            key={entity}
            className="max-w-full truncate rounded border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-2 py-1 font-[var(--font-mono)] text-[11px] font-semibold text-[var(--text-primary)]"
          >
            {entity}
          </span>
        ))}
        {hasMore && (
          <span
            className="text-[11px] text-[var(--text-tertiary)]"
            aria-label={`${entities.length - DISPLAY_LIMIT} more entities`}
          >
            …
          </span>
        )}
      </div>
    </div>
  )
}

interface EntryPointsSectionProps {readonly entryPoints: readonly string[]}

export function EntryPointsSection({entryPoints,}: Readonly<EntryPointsSectionProps>): React.ReactElement {
  const displayedEntryPoints = entryPoints.slice(0, DISPLAY_LIMIT)
  const hasMore = entryPoints.length > DISPLAY_LIMIT

  return (
    <div className="pb-0">
      <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[var(--text-tertiary)]">
        Entry Points ({entryPoints.length})
      </h4>
      <div className="flex flex-col gap-1">
        {displayedEntryPoints.map((path) => (
          <div
            key={path}
            className="truncate rounded bg-[var(--bg-tertiary)] px-2 py-1 font-[var(--font-mono)] text-[11px] text-[var(--text-secondary)]"
          >
            {path}
          </div>
        ))}
        {hasMore && (
          <span
            className="text-[11px] text-[var(--text-tertiary)]"
            aria-label={`${entryPoints.length - DISPLAY_LIMIT} more entry points`}
          >
            …
          </span>
        )}
      </div>
    </div>
  )
}
