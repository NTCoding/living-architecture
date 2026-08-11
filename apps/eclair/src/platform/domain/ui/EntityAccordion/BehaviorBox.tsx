interface BehaviorBoxProps {
  readonly label: string
  readonly items: readonly string[] | undefined
  readonly icon: string
  readonly color: 'blue' | 'amber' | 'green' | 'purple'
}

const colorStyles: Record<BehaviorBoxProps['color'], string> = {
  blue: 'border-l-[var(--node-event)]',
  amber: 'border-l-[var(--node-domainop)]',
  green: 'border-l-[var(--green)]',
  purple: 'border-l-[var(--purple)]',
}

export function BehaviorBox({
  label,
  items,
  icon,
  color,
}: Readonly<BehaviorBoxProps>): React.ReactElement {
  const hasItems = items !== undefined && items.length > 0

  return (
    <div
      className={`overflow-hidden rounded border-l-4 bg-[var(--bg-secondary)] p-3 ${colorStyles[color]} ${
        hasItems ? '' : 'opacity-50'
      }`}
    >
      <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[var(--text-tertiary)]">
        <i className={`ph ${icon}`} aria-hidden="true" />
        {label}
      </div>
      {hasItems && (
        <ul className="space-y-1 text-sm text-[var(--text-secondary)]">
          {items.map((item) => (
            <li key={item} className="truncate" title={item}>
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
