import { useMemo } from 'react'
import type { RiviereGraph } from '@living-architecture/riviere-schema'
import { compareByCodePoint } from '@/platform/domain/compare-by-code-point'
import { extractFlows } from '../extractFlows'
import { FlowCard } from '../components/FlowCard/FlowCard'
import {
  useFlowsState, type FlowFilter 
} from '../hooks/useFlowsState'

interface FlowsPageProps {readonly graph: RiviereGraph}

export function FlowsPage({ graph }: Readonly<FlowsPageProps>): React.ReactElement {
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

      if (activeFilter === 'ui' && flow.entryPoint.type !== 'UI') return false
      if (activeFilter === 'api' && flow.entryPoint.type !== 'API') return false
      if (activeFilter === 'jobs' && flow.entryPoint.type !== 'Custom') return false

      if (activeDomains.size > 0 && !activeDomains.has(flow.entryPoint.domain)) return false

      return true
    })
  }, [flows, searchQuery, activeFilter, activeDomains])

  const uiCount = flows.filter((f) => f.entryPoint.type === 'UI').length
  const apiCount = flows.filter((f) => f.entryPoint.type === 'API').length
  const jobsCount = flows.filter((f) => f.entryPoint.type === 'Custom').length

  const filters: Array<{
    key: FlowFilter
    label: string
  }> = [
    {
      key: 'all',
      label: 'All',
    },
    {
      key: 'ui',
      label: 'UI',
    },
    {
      key: 'api',
      label: 'API',
    },
    {
      key: 'jobs',
      label: 'Jobs',
    },
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
        <div className="stats-bar-item">
          <i className="ph ph-browser stats-bar-icon" aria-hidden="true" />
          <div className="stats-bar-content">
            <div className="stats-bar-label">UI Entries</div>
            <div data-testid="stat-ui-entries" className="stats-bar-value">
              {uiCount}
            </div>
          </div>
        </div>
        <div className="stats-bar-item">
          <i className="ph ph-plug stats-bar-icon" aria-hidden="true" />
          <div className="stats-bar-content">
            <div className="stats-bar-label">API Entries</div>
            <div data-testid="stat-api-entries" className="stats-bar-value">
              {apiCount}
            </div>
          </div>
        </div>
        <div className="stats-bar-item">
          <i className="ph ph-clock stats-bar-icon" aria-hidden="true" />
          <div className="stats-bar-content">
            <div className="stats-bar-label">Scheduled Jobs</div>
            <div data-testid="stat-scheduled-jobs" className="stats-bar-value">
              {jobsCount}
            </div>
          </div>
        </div>
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
              className={`filter-tag ${activeFilter === filter.key ? 'active' : ''}`}
              onClick={() => setActiveFilter(filter.key)}
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
          />
        ))}
      </section>
    </div>
  )
}
