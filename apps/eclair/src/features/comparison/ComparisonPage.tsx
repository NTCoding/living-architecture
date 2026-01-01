import { useState, useCallback, useRef } from 'react'
import type { RiviereGraph, Node } from '@/types/riviere'
import { parseRiviereGraph } from '@living-architecture/riviere-schema'
import { compareGraphs, type GraphDiff } from './compareGraphs'
import { computeDomainConnectionDiff, type DomainConnectionDiffResult } from './computeDomainConnectionDiff'
import { FilterTabs, DomainFilter, TypeFilter, type ChangeFilter } from './ChangeFilters'
import { StatsBar } from './StatsBar'
import { DomainConnectionDiff } from './DomainConnectionDiff'

type ResultsViewMode = 'graph' | 'list'

interface ChangeItemBase {
  readonly node: Node
  readonly changeType: 'added' | 'removed' | 'modified'
  readonly changedFields?: string[]
}

function buildChangeItems(diff: GraphDiff): ChangeItemBase[] {
  const items: ChangeItemBase[] = []

  for (const addition of diff.nodes.added) {
    items.push({ node: addition.node, changeType: 'added' })
  }

  for (const removal of diff.nodes.removed) {
    items.push({ node: removal.node, changeType: 'removed' })
  }

  for (const modification of diff.nodes.modified) {
    items.push({ node: modification.after, changeType: 'modified', changedFields: modification.changedFields })
  }

  return items
}

interface UploadedFile {
  readonly name: string
  readonly graph: RiviereGraph
}

interface UploadError {
  readonly message: string
}

type UploadState =
  | { readonly status: 'empty' }
  | { readonly status: 'loaded'; readonly file: UploadedFile }
  | { readonly status: 'error'; readonly error: UploadError }

function parseGraphFile(content: string, fileName: string): UploadState {
  try {
    const data: unknown = JSON.parse(content)
    const graph = parseRiviereGraph(data)
    return { status: 'loaded', file: { name: fileName, graph } }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return { status: 'error', error: { message } }
  }
}

interface UploadZoneProps {
  readonly label: string
  readonly sublabel: string
  readonly number: number
  readonly state: UploadState
  readonly onFileSelect: (file: File) => void
}

function UploadZone({ label, sublabel, number, state, onFileSelect }: UploadZoneProps): React.ReactElement {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      onFileSelect(file)
    }
  }, [onFileSelect])

  const handleClick = useCallback(() => {
    inputRef.current?.click()
  }, [])

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      inputRef.current?.click()
    }
  }, [])

  const isLoaded = state.status === 'loaded'
  const hasError = state.status === 'error'

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--primary)] text-sm font-bold text-white">
          {number}
        </div>
        <div>
          <div className="font-bold text-[var(--text-primary)]">{label}</div>
          <div className="text-xs text-[var(--text-tertiary)]">{sublabel}</div>
        </div>
      </div>
      {(() => {
        const getBorderColor = (): string => {
          if (isLoaded) return 'border-green-500 bg-green-50 dark:bg-green-950'
          if (hasError) return 'border-red-500 bg-red-50 dark:bg-red-950'
          return 'border-[var(--border-color)] bg-[var(--bg-secondary)]'
        }
        const borderColor = getBorderColor()
        return (
          <div
            role="button"
            tabIndex={0}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            className={`flex min-h-[140px] cursor-pointer flex-col items-center justify-center gap-2 rounded-[var(--radius)] border-2 border-dashed p-6 transition-all hover:border-[var(--primary)] hover:bg-[var(--bg-tertiary)] ${borderColor}`}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleChange}
              className="sr-only"
              aria-label={`Upload ${label} file`}
            />
            {state.status === 'empty' && (
              <>
                <i className="ph ph-file-arrow-up text-4xl text-[var(--text-tertiary)]" aria-hidden="true" />
                <div className="text-center">
                  <div className="font-semibold text-[var(--text-primary)]">Drop JSON file or click to upload</div>
                  <div className="text-xs text-[var(--text-tertiary)]">Rivière schema JSON</div>
                </div>
              </>
            )}
            {state.status === 'loaded' && (
              <>
                <i className="ph ph-check-circle text-4xl text-green-600" aria-hidden="true" />
                <div className="text-center">
                  <div className="font-semibold text-green-600">{state.file.name}</div>
                  <div className="text-xs text-[var(--text-tertiary)]">
                    {state.file.graph.components.length} nodes
                  </div>
                </div>
              </>
            )}
            {state.status === 'error' && (
              <>
                <i className="ph ph-x-circle text-4xl text-red-600" aria-hidden="true" />
                <div className="text-center">
                  <div className="font-semibold text-red-600">Invalid file</div>
                  <div className="text-xs text-red-500">{state.error.message}</div>
                </div>
              </>
            )}
          </div>
        )
      })()}
    </div>
  )
}

interface ChangeItemProps {
  readonly item: ChangeItemBase
}

function ChangeItem({ item }: Readonly<ChangeItemProps>): React.ReactElement {
  const { node, changeType, changedFields } = item

  const changeIndicator = {
    added: { text: '+ ADDED', color: 'text-[#1A7F37]' },
    removed: { text: '- REMOVED', color: 'text-[#FF6B6B]' },
    modified: { text: '~ MODIFIED', color: 'text-amber-500' },
  }[changeType]

  const borderColor = {
    added: 'border-l-[#1A7F37]',
    removed: 'border-l-[#FF6B6B]',
    modified: 'border-l-amber-500',
  }[changeType]

  return (
    <div className={`rounded-[var(--radius)] border border-[var(--border-color)] ${borderColor} border-l-4 bg-[var(--bg-secondary)] p-4`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="rounded bg-[var(--bg-tertiary)] px-2 py-0.5 text-xs font-semibold uppercase text-[var(--text-secondary)]">
            {node.type}
          </span>
          <span className="font-semibold text-[var(--text-primary)]">{node.name}</span>
          <span className="text-sm text-[var(--text-tertiary)]">{node.domain} · {node.module}</span>
        </div>
        <span className={`text-xs font-bold ${changeIndicator.color}`}>{changeIndicator.text}</span>
      </div>
      {node.description !== undefined && (
        <p className="mt-2 text-sm text-[var(--text-secondary)]">{node.description}</p>
      )}
      {changeType === 'modified' && changedFields !== undefined && changedFields.length > 0 && (
        <p className="mt-2 text-xs text-[var(--text-tertiary)]">
          Changed: {changedFields.join(', ')}
        </p>
      )}
    </div>
  )
}

function extractUniqueDomains(items: ChangeItemBase[]): string[] {
  const domains = new Set<string>()
  for (const item of items) {
    domains.add(item.node.domain)
  }
  return Array.from(domains).sort((a, b) => a.localeCompare(b))
}

function extractUniqueTypes(items: ChangeItemBase[]): string[] {
  const types = new Set<string>()
  for (const item of items) {
    types.add(item.node.type)
  }
  return Array.from(types).sort((a, b) => a.localeCompare(b))
}

interface DetailedChangesProps {
  readonly diff: GraphDiff
}

function DetailedChanges({ diff }: Readonly<DetailedChangesProps>): React.ReactElement {
  const [filter, setFilter] = useState<ChangeFilter>('all')
  const [domainFilter, setDomainFilter] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState<string | null>(null)

  const allItems = buildChangeItems(diff)
  const uniqueDomains = extractUniqueDomains(allItems)
  const uniqueTypes = extractUniqueTypes(allItems)

  const filteredItems = allItems
    .filter((item) => filter === 'all' || item.changeType === filter)
    .filter((item) => domainFilter === null || item.node.domain === domainFilter)
    .filter((item) => typeFilter === null || item.node.type === typeFilter)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-[var(--text-primary)]">Detailed Changes</h3>
        <FilterTabs activeFilter={filter} onFilterChange={setFilter} />
      </div>
      {uniqueDomains.length > 1 && (
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold uppercase text-[var(--text-tertiary)]">Domain</span>
          <DomainFilter domains={uniqueDomains} activeDomain={domainFilter} onDomainChange={setDomainFilter} />
        </div>
      )}
      {uniqueTypes.length > 1 && (
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold uppercase text-[var(--text-tertiary)]">Type</span>
          <TypeFilter types={uniqueTypes} activeType={typeFilter} onTypeChange={setTypeFilter} />
        </div>
      )}
      <div className="space-y-3">
        {filteredItems.map((item) => (
          <ChangeItem key={item.node.id} item={item} />
        ))}
        {filteredItems.length === 0 && (
          <p className="py-8 text-center text-sm text-[var(--text-tertiary)]">No changes to display</p>
        )}
      </div>
    </div>
  )
}

export function ComparisonPage(): React.ReactElement {
  const [beforeState, setBeforeState] = useState<UploadState>({ status: 'empty' })
  const [afterState, setAfterState] = useState<UploadState>({ status: 'empty' })
  const [comparisonResult, setComparisonResult] = useState<GraphDiff | null>(null)
  const [domainDiff, setDomainDiff] = useState<DomainConnectionDiffResult | null>(null)
  const [viewMode, setViewMode] = useState<ResultsViewMode>('graph')

  const handleBeforeFileSelect = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result
      if (typeof content !== 'string') {
        setBeforeState({ status: 'error', error: { message: 'Failed to read file' } })
        return
      }
      setBeforeState(parseGraphFile(content, file.name))
    }
    reader.onerror = () => {
      setBeforeState({ status: 'error', error: { message: 'Failed to read file' } })
    }
    reader.readAsText(file)
  }, [])

  const handleAfterFileSelect = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result
      if (typeof content !== 'string') {
        setAfterState({ status: 'error', error: { message: 'Failed to read file' } })
        return
      }
      setAfterState(parseGraphFile(content, file.name))
    }
    reader.onerror = () => {
      setAfterState({ status: 'error', error: { message: 'Failed to read file' } })
    }
    reader.readAsText(file)
  }, [])

  const canCompare = beforeState.status === 'loaded' && afterState.status === 'loaded'

  const handleCompare = useCallback(() => {
    if (beforeState.status !== 'loaded' || afterState.status !== 'loaded') return

    const diff = compareGraphs(beforeState.file.graph, afterState.file.graph)
    setComparisonResult(diff)

    const connectionDiff = computeDomainConnectionDiff(beforeState.file.graph, afterState.file.graph)
    setDomainDiff(connectionDiff)
  }, [beforeState, afterState])

  return (
    <div className="space-y-8">
      {comparisonResult === null && (
        <>
          <header>
            <h1 className="font-[var(--font-heading)] text-2xl font-bold text-[var(--text-primary)]">
              Compare Versions
            </h1>
            <p className="text-[var(--text-secondary)]">
              Track architecture changes between graph versions
            </p>
          </header>

          <section className="rounded-[var(--radius)] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-8">
            <div className="grid gap-8 md:grid-cols-[1fr_auto_1fr]">
              <UploadZone
                label="Before"
                sublabel="Earlier version"
                number={1}
                state={beforeState}
                onFileSelect={handleBeforeFileSelect}
              />

              <div className="hidden items-center justify-center md:flex">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--bg-tertiary)]">
                  <i className="ph ph-arrow-right text-xl text-[var(--text-tertiary)]" aria-hidden="true" />
                </div>
              </div>

              <UploadZone
                label="After"
                sublabel="Latest version"
                number={2}
                state={afterState}
                onFileSelect={handleAfterFileSelect}
              />
            </div>

            <div className="mt-8 flex justify-center">
              <button
                type="button"
                onClick={handleCompare}
                disabled={!canCompare}
                className="flex items-center gap-2 rounded-[var(--radius)] bg-[var(--primary)] px-8 py-3 font-semibold text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <i className="ph ph-git-diff" aria-hidden="true" />
                Compare Graphs
              </button>
            </div>
          </section>
        </>
      )}

      {comparisonResult !== null && (
        <section className="space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-[var(--font-heading)] text-2xl font-bold text-[var(--text-primary)]">
                Comparing Versions
              </h1>
              {beforeState.status === 'loaded' && afterState.status === 'loaded' && (
                <p className="text-[var(--text-secondary)]">
                  {beforeState.file.name} → {afterState.file.name}
                </p>
              )}
            </div>
            <div className="view-mode-switcher">
              <button
                type="button"
                className={`view-mode-btn ${viewMode === 'graph' ? 'active' : ''}`}
                onClick={() => setViewMode('graph')}
              >
                <i className="ph ph-graph" aria-hidden="true" />
                Graph
              </button>
              <button
                type="button"
                className={`view-mode-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
              >
                <i className="ph ph-list" aria-hidden="true" />
                List
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--text-tertiary)]">Node Changes</h2>
            <StatsBar diff={comparisonResult} />
          </div>

          {viewMode === 'graph' && domainDiff !== null && (
            <div className="space-y-3">
              <div className="flex items-baseline justify-between">
                <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--text-tertiary)]">Cross-Domain Connection Changes</h2>
                <span className="text-xs text-[var(--text-tertiary)]">
                  {domainDiff.connections.added.length} added · {domainDiff.connections.removed.length} removed
                </span>
              </div>
              <DomainConnectionDiff diff={domainDiff} />
            </div>
          )}

          {viewMode === 'list' && <DetailedChanges diff={comparisonResult} />}
        </section>
      )}
    </div>
  )
}
