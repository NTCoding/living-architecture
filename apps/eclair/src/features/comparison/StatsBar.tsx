import type { GraphDiff } from './compareGraphs'

interface StatsBarProps {readonly diff: GraphDiff}

export function StatsBar({ diff }: Readonly<StatsBarProps>): React.ReactElement {
  return (
    <div className="flex flex-wrap gap-4 rounded-[var(--radius)] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 md:flex-nowrap md:gap-6">
      <div className="flex items-center gap-3 border-r border-[var(--border-color)] pr-6 last:border-r-0 last:pr-0">
        <i className="ph ph-plus-circle text-xl text-green-600" aria-hidden="true" />
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Added</span>
          <span className="font-[var(--font-heading)] text-xl font-bold text-green-600">{diff.stats.nodesAdded}</span>
        </div>
      </div>
      <div className="flex items-center gap-3 border-r border-[var(--border-color)] pr-6 last:border-r-0 last:pr-0">
        <i className="ph ph-minus-circle text-xl text-red-500" aria-hidden="true" />
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Removed</span>
          <span className="font-[var(--font-heading)] text-xl font-bold text-red-500">{diff.stats.nodesRemoved}</span>
        </div>
      </div>
      <div className="flex items-center gap-3 border-r border-[var(--border-color)] pr-6 last:border-r-0 last:pr-0">
        <i className="ph ph-pencil-circle text-xl text-amber-500" aria-hidden="true" />
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Modified</span>
          <span className="font-[var(--font-heading)] text-xl font-bold text-amber-500">{diff.stats.nodesModified}</span>
        </div>
      </div>
      <div className="flex items-center gap-3 border-r border-[var(--border-color)] pr-6 last:border-r-0 last:pr-0">
        <i className="ph ph-equals text-xl text-[var(--text-tertiary)]" aria-hidden="true" />
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Unchanged</span>
          <span className="font-[var(--font-heading)] text-xl font-bold text-[var(--text-primary)]">{diff.stats.nodesUnchanged}</span>
        </div>
      </div>
    </div>
  )
}
