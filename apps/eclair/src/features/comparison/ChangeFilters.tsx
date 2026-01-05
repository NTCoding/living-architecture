type ChangeFilter = 'all' | 'added' | 'removed' | 'modified'

interface FilterTabsProps {
  readonly activeFilter: ChangeFilter
  readonly onFilterChange: (filter: ChangeFilter) => void
}

export function FilterTabs({
  activeFilter, onFilterChange 
}: FilterTabsProps): React.ReactElement {
  const filters: Array<{
    key: ChangeFilter;
    label: string 
  }> = [
    {
      key: 'all',
      label: 'All Changes' 
    },
    {
      key: 'added',
      label: 'Added' 
    },
    {
      key: 'removed',
      label: 'Removed' 
    },
    {
      key: 'modified',
      label: 'Modified' 
    },
  ]

  return (
    <div className="flex gap-2">
      {filters.map((filter) => (
        <button
          key={filter.key}
          type="button"
          onClick={() => onFilterChange(filter.key)}
          className={`rounded-[var(--radius)] px-3 py-1.5 text-sm font-medium transition-all ${
            activeFilter === filter.key
              ? 'bg-[var(--primary)] text-white'
              : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
          }`}
        >
          {filter.label}
        </button>
      ))}
    </div>
  )
}

interface DomainFilterProps {
  readonly domains: string[]
  readonly activeDomain: string | null
  readonly onDomainChange: (domain: string | null) => void
}

export function DomainFilter({
  domains, activeDomain, onDomainChange 
}: DomainFilterProps): React.ReactElement {
  return (
    <div className="flex gap-2">
      {domains.map((domain) => (
        <button
          key={domain}
          type="button"
          onClick={() => onDomainChange(activeDomain === domain ? null : domain)}
          className={`rounded-[var(--radius)] px-3 py-1.5 text-sm font-medium transition-all ${
            activeDomain === domain
              ? 'bg-[var(--primary)] text-white'
              : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
          }`}
        >
          {domain}
        </button>
      ))}
    </div>
  )
}

interface TypeFilterProps {
  readonly types: string[]
  readonly activeType: string | null
  readonly onTypeChange: (type: string | null) => void
}

export function TypeFilter({
  types, activeType, onTypeChange 
}: TypeFilterProps): React.ReactElement {
  return (
    <div className="flex gap-2">
      {types.map((type) => (
        <button
          key={type}
          type="button"
          onClick={() => onTypeChange(activeType === type ? null : type)}
          className={`rounded-[var(--radius)] px-3 py-1.5 text-sm font-medium transition-all ${
            activeType === type
              ? 'bg-[var(--primary)] text-white'
              : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
          }`}
        >
          {type}
        </button>
      ))}
    </div>
  )
}

export type { ChangeFilter }
