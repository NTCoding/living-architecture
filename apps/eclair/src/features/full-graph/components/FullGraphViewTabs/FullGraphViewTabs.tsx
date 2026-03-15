import { forwardRef } from 'react'

export type FullGraphViewMode = 'graph' | 'clustered'

interface FullGraphViewTabsProps {
  readonly viewMode: FullGraphViewMode
  readonly onChange: (mode: FullGraphViewMode) => void
}

interface ViewModeTabProps {
  readonly mode: FullGraphViewMode
  readonly label: string
  readonly icon: string
  readonly isSelected: boolean
  readonly onClick: () => void
}

const ViewModeTab = forwardRef<HTMLButtonElement, ViewModeTabProps>(function ViewModeTab(
  { label, icon, isSelected, onClick },
  ref,
) {
  return (
    <button
      ref={ref}
      role="tab"
      aria-selected={isSelected}
      tabIndex={isSelected ? 0 : -1}
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
        isSelected
          ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm'
          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
      }`}
    >
      <i className={`ph ${icon}`} aria-hidden="true" />
      {label}
    </button>
  )
})

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
        mode="graph"
        label="Graph"
        icon="ph-graph"
        isSelected={viewMode === 'graph'}
        onClick={() => onChange('graph')}
      />
      <ViewModeTab
        mode="clustered"
        label="Clustered"
        icon="ph-circles-three-plus"
        isSelected={viewMode === 'clustered'}
        onClick={() => onChange('clustered')}
      />
    </div>
  )
}
