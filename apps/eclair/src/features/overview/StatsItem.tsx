interface StatsItemProps {
  readonly icon: string
  readonly label: string
  readonly value: number
}

export function StatsItem({
  icon, label, value 
}: Readonly<StatsItemProps>): React.ReactElement {
  return (
    <div className="flex items-center gap-3 border-r border-[var(--border-color)] pr-6 last:border-r-0 last:pr-0 md:border-r md:pr-6">
      <i className={`ph ph-${icon} text-xl text-[var(--primary)]`} aria-hidden="true" />
      <div className="flex flex-col gap-0.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
          {label}
        </span>
        <span className="font-[var(--font-heading)] text-xl font-bold text-[var(--text-primary)]">
          {value}
        </span>
      </div>
    </div>
  )
}
