import { useState, useCallback } from 'react'
import type { NodeType } from '@/types/riviere'

interface NodeTypeInfo {
  readonly type: NodeType
  readonly nodeCount: number
}

interface NodeTypeFiltersProps {
  readonly nodeTypes: readonly NodeTypeInfo[]
  readonly visibleTypes: Set<NodeType>
  readonly onToggleType: (type: NodeType) => void
  readonly onShowAll: () => void
  readonly onHideAll: () => void
}

export function NodeTypeFilters({
  nodeTypes,
  visibleTypes,
  onToggleType,
  onShowAll,
  onHideAll,
}: Readonly<NodeTypeFiltersProps>): React.ReactElement {
  const [isOpen, setIsOpen] = useState(true)

  const toggleOpen = useCallback(() => {
    setIsOpen((prev) => !prev)
  }, [])

  const allVisible = nodeTypes.every((nt) => visibleTypes.has(nt.type))
  const noneVisible = visibleTypes.size === 0

  return (
    <div
      className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)]"
      data-testid="node-type-filters"
    >
      <button
        type="button"
        onClick={toggleOpen}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
        aria-expanded={isOpen}
        aria-controls="node-type-filter-list"
        data-testid="node-type-filters-toggle"
      >
        <span className="text-sm font-semibold text-[var(--text-primary)]">
          Node Type Filters
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
          id="node-type-filter-list"
          className="border-t border-[var(--border-color)] p-4"
        >
          <div className="mb-3 flex gap-2">
            <button
              type="button"
              onClick={onShowAll}
              disabled={allVisible}
              className="flex-1 rounded px-2 py-1 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-tertiary)] disabled:opacity-50"
              data-testid="node-type-filters-show-all"
            >
              Show All
            </button>
            <button
              type="button"
              onClick={onHideAll}
              disabled={noneVisible}
              className="flex-1 rounded px-2 py-1 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-tertiary)] disabled:opacity-50"
              data-testid="node-type-filters-hide-all"
            >
              Hide All
            </button>
          </div>

          <div className="space-y-2">
            {nodeTypes.map((nodeType) => {
              const isVisible = visibleTypes.has(nodeType.type)
              return (
                <label
                  key={nodeType.type}
                  className="flex cursor-pointer items-center gap-3 rounded px-2 py-1.5 transition-colors hover:bg-[var(--bg-tertiary)]"
                >
                  <input
                    type="checkbox"
                    checked={isVisible}
                    onChange={() => onToggleType(nodeType.type)}
                    className="h-4 w-4 rounded border-[var(--border-color)] accent-[var(--primary)]"
                    data-testid={`node-type-checkbox-${nodeType.type}`}
                  />
                  <span className="flex-1 text-sm text-[var(--text-primary)]">
                    {nodeType.type}
                  </span>
                  <span className="text-xs text-[var(--text-tertiary)]">
                    {nodeType.nodeCount}
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
