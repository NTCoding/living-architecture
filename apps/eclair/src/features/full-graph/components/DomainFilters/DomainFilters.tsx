import {
  useState, useCallback 
} from 'react'

interface DomainInfo {
  readonly name: string
  readonly nodeCount: number
}

interface DomainFiltersProps {
  readonly domains: readonly DomainInfo[]
  readonly visibleDomains: Set<string>
  readonly onToggleDomain: (domain: string) => void
  readonly onShowAll: () => void
  readonly onHideAll: () => void
}

export function DomainFilters({
  domains,
  visibleDomains,
  onToggleDomain,
  onShowAll,
  onHideAll,
}: Readonly<DomainFiltersProps>): React.ReactElement {
  const [isOpen, setIsOpen] = useState(true)

  const toggleOpen = useCallback(() => {
    setIsOpen((prev) => !prev)
  }, [])

  const allVisible = domains.every((d) => visibleDomains.has(d.name))
  const noneVisible = visibleDomains.size === 0

  return (
    <div
      className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)]"
      data-testid="domain-filters"
    >
      <button
        type="button"
        onClick={toggleOpen}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
        aria-expanded={isOpen}
        aria-controls="domain-filter-list"
        data-testid="domain-filters-toggle"
      >
        <span className="text-sm font-semibold text-[var(--text-primary)]">
          Domain Filters
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`text-[var(--text-tertiary)] transition-transform ${isOpen ? 'rotate-180' : ''}`}
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {isOpen && (
        <div
          id="domain-filter-list"
          className="border-t border-[var(--border-color)] p-4"
        >
          <div className="mb-3 flex gap-2">
            <button
              type="button"
              onClick={onShowAll}
              disabled={allVisible}
              className="flex-1 rounded px-2 py-1 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-tertiary)] disabled:opacity-50"
              data-testid="domain-filters-show-all"
            >
              Show All
            </button>
            <button
              type="button"
              onClick={onHideAll}
              disabled={noneVisible}
              className="flex-1 rounded px-2 py-1 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-tertiary)] disabled:opacity-50"
              data-testid="domain-filters-hide-all"
            >
              Hide All
            </button>
          </div>

          <div className="space-y-2">
            {domains.map((domain) => {
              const isVisible = visibleDomains.has(domain.name)
              return (
                <label
                  key={domain.name}
                  className="flex cursor-pointer items-center gap-3 rounded px-2 py-1.5 transition-colors hover:bg-[var(--bg-tertiary)]"
                >
                  <input
                    type="checkbox"
                    checked={isVisible}
                    onChange={() => onToggleDomain(domain.name)}
                    className="h-4 w-4 rounded border-[var(--border-color)] accent-[var(--primary)]"
                    data-testid={`domain-checkbox-${domain.name}`}
                  />
                  <span className="flex-1 text-sm text-[var(--text-primary)]">
                    {domain.name}
                  </span>
                  <span className="text-xs text-[var(--text-tertiary)]">
                    {domain.nodeCount}
                  </span>
                </label>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
