export type FullGraphViewMode = 'graph' | 'clustered'

interface FullGraphViewTabsProps {
  readonly viewMode: FullGraphViewMode
  readonly onChange: (mode: FullGraphViewMode) => void
}

interface ViewModeTabProps {
  readonly label: string
  readonly isSelected: boolean
  readonly onClick: () => void
}

function ViewModeTab({
  label,
  isSelected,
  onClick,
}: Readonly<ViewModeTabProps>): React.ReactElement {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={isSelected}
      tabIndex={isSelected ? 0 : -1}
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
        isSelected
          ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm'
          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
      }`}
    >
      {label}
    </button>
  )
}

export function FullGraphViewTabs({
  viewMode,
  onChange,
}: Readonly<FullGraphViewTabsProps>): React.ReactElement {
  return (
    <div
      role="tablist"
      aria-label="Graph view"
      className="flex rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] p-0.5"
      data-testid="full-graph-view-tabs"
    >
      <ViewModeTab
        label="Graph"
        isSelected={viewMode === 'graph'}
        onClick={() => onChange('graph')}
      />
      <ViewModeTab
        label="Clustered"
        isSelected={viewMode === 'clustered'}
        onClick={() => onChange('clustered')}
      />
    </div>
  )
}
