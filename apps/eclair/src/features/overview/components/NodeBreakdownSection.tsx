import { getNodeTypeColor } from '@/platform/domain/node-type-presentation'
import type { Theme } from '@/types/theme'

interface NodeBreakdownSectionProps {
  readonly breakdown: Readonly<Record<string, number>>
  readonly theme: Theme
}

export function NodeBreakdownSection({
  breakdown,
  theme,
}: Readonly<NodeBreakdownSectionProps>): React.ReactElement {
  const items = Object.entries(breakdown)
    .map(([label, value]) => ({
      label,
      value,
    }))
    .filter((item) => item.value > 0)
    .sort((left, right) => left.label.localeCompare(right.label))

  return (
    <div className="mb-3 border-b border-[var(--border-color)] pb-3">
      <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[var(--text-tertiary)]">
        Node Breakdown
      </h4>
      <div className="grid grid-cols-2 gap-1.5">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between rounded bg-[var(--bg-tertiary)] px-2 py-1 text-xs"
          >
            <span className="flex min-w-0 items-center gap-1.5 font-medium text-[var(--text-secondary)]">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: getNodeTypeColor(item.label, theme) }}
              />
              <span className="truncate">{item.label}</span>
            </span>
            <span className="font-bold text-[var(--text-primary)]">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
