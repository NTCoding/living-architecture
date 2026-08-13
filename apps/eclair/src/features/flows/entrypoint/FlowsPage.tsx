import { useMemo } from 'react'
import type { RiviereGraph } from '@living-architecture/riviere-schema/schema'
import { compareByCodePoint } from '../queries/compare-by-code-point'
import { extractFlows } from '../queries/extract-flows'
import { FlowCard } from '../components/FlowCard/FlowCard'
import {
  type FlowTypeFilter,
  useFlowsState,
} from '../hooks/useFlowsState'
import type { Theme } from '@/types/theme'
import { DEFAULT_THEME } from '@/types/theme'

function isActiveFilter(activeFilter: FlowTypeFilter, candidateFilter: FlowTypeFilter): boolean {
  if (activeFilter.kind === 'all') return candidateFilter.kind === 'all'

  return candidateFilter.kind === 'type' && activeFilter.value === candidateFilter.value
}

interface FlowsPageProps {
  readonly graph: RiviereGraph
  readonly theme?: Theme
}

export function FlowsPage({
  graph,
  theme = DEFAULT_THEME,
}: Readonly<FlowsPageProps>): React.ReactElement {
  const {
    searchQuery,
    setSearchQuery,
    activeFilter,
    setActiveFilter,
    expandedFlowIds,
    toggleFlow,
    activeDomains,
    toggleDomain,
  } = useFlowsState()

  const flows = useMemo(() => extractFlows(graph), [graph])

  const domains = useMemo(() => {
    const domainSet = new Set(flows.map((f) => f.entryPoint.domain))
    return Array.from(domainSet).sort(compareByCodePoint)
  }, [flows])

  const filteredFlows = useMemo(() => {
    return flows.filter((flow) => {
      const matchesSearch = flow.entryPoint.name.toLowerCase().includes(searchQuery.toLowerCase())

      if (!matchesSearch) return false

      if (activeFilter.kind === 'type' && flow.entryPoint.type !== activeFilter.value) return false

      if (activeDomains.size > 0 && !activeDomains.has(flow.entryPoint.domain)) return false

      return true
    })
  }, [flows, searchQuery, activeFilter, activeDomains])

  const typeCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const flow of flows) {
      counts.set(flow.entryPoint.type, (counts.get(flow.entryPoint.type) ?? 0) + 1)
    }
    return [...counts.entries()].sort(([left], [right]) => left.localeCompare(right))
  }, [flows])

  const filters: Array<{
    key: string
    label: string
    filter: FlowTypeFilter
  }> = [
    {
      key: 'filter:all',
      label: 'All',
      filter: { kind: 'all' },
    },
    ...typeCounts.map(([type]) => ({
      key: `type:${type}`,
      label: type,
      filter: {
        kind: 'type' as const,
        value: type,
      },
    })),
  ]

  return (
    <div data-testid="flows-page" className="space-y-6">
      <header className="page-header">
        <h1 className="page-title">Flows</h1>
        <p className="page-subtitle">Entry points and their traces through the system</p>
      </header>

      <div data-testid="stats-bar" className="stats-bar">
        <div className="stats-bar-item">
          <i className="ph ph-flow-arrow stats-bar-icon" aria-hidden="true" />
          <div className="stats-bar-content">
            <div className="stats-bar-label">Total Flows</div>
            <div data-testid="stat-total-flows" className="stats-bar-value">
              {flows.length}
            </div>
          </div>
        </div>
        {typeCounts.map(([type, count]) => (
          <div key={type} className="stats-bar-item">
            <i className="ph ph-cube stats-bar-icon" aria-hidden="true" />
            <div className="stats-bar-content">
              <div className="stats-bar-label">{type} entries</div>
              <div data-testid={`stat-${type}`} className="stats-bar-value">
                {count}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="filters-section">
        <div className="search-container">
          <i className="ph ph-magnifying-glass search-icon" aria-hidden="true" />
          <input
            type="text"
            className="search-input"
            placeholder="Search flows..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="filter-divider" />
        <span className="filter-label">Type:</span>
        <div className="filter-group">
          {filters.map((filter) => (
            <button
              key={filter.key}
              type="button"
              className={`filter-tag ${isActiveFilter(activeFilter, filter.filter) ? 'active' : ''}`}
              onClick={() => setActiveFilter(filter.filter)}
            >
              {filter.label}
            </button>
          ))}
        </div>
        {domains.length > 0 && (
          <>
            <div className="filter-divider" />
            <span className="filter-label">Domain:</span>
            <div className="filter-group">
              {domains.map((domain) => (
                <button
                  key={domain}
                  type="button"
                  className={`filter-tag ${activeDomains.has(domain) ? 'active' : ''}`}
                  onClick={() => toggleDomain(domain)}
                >
                  {domain}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <section className="flow-list">
        {filteredFlows.map((flow) => (
          <FlowCard
            key={flow.entryPoint.id}
            flow={flow}
            graph={graph}
            expanded={expandedFlowIds.has(flow.entryPoint.id)}
            onToggle={() => toggleFlow(flow.entryPoint.id)}
            theme={theme}
          />
        ))}
      </section>
    </div>
  )
}
