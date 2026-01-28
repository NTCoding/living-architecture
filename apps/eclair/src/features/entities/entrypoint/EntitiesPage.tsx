import {
  useState, useMemo, useCallback 
} from 'react'
import { useNavigate } from 'react-router-dom'
import { RiviereQuery } from '@living-architecture/riviere-query'
import type { Entity } from '@living-architecture/riviere-query'
import type { RiviereGraph } from '@living-architecture/riviere-schema'
import { EntityAccordion } from '../../domains/components/EntityAccordion/EntityAccordion'

interface EntitiesPageProps {readonly graph: RiviereGraph}

export function EntitiesPage({ graph }: Readonly<EntitiesPageProps>): React.ReactElement {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDomain, setSelectedDomain] = useState<string>('all')

  const handleViewOnGraph = useCallback(
    (nodeId: string) => {
      navigate(`/full-graph?node=${nodeId}`)
    },
    [navigate],
  )

  const entities = useMemo<Entity[]>(() => {
    const query = new RiviereQuery(graph)
    return query.entities()
  }, [graph])

  const filteredEntities = useMemo(() => {
    return entities.filter((entity) => {
      const matchesSearch =
        entity.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entity.domain.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesDomain = selectedDomain === 'all' || entity.domain === selectedDomain

      return matchesSearch && matchesDomain
    })
  }, [entities, searchQuery, selectedDomain])

  const domains = useMemo(() => {
    return Array.from(new Set(entities.map((e) => e.domain)))
  }, [entities])

  const totalOperations = useMemo(() => {
    return entities.reduce((sum, entity) => sum + entity.operations.length, 0)
  }, [entities])

  const toggleDomain = (domain: string): void => {
    setSelectedDomain((prev) => (prev === domain ? 'all' : domain))
  }

  return (
    <div data-testid="entities-page" className="space-y-6">
      <header className="page-header">
        <h1 className="page-title">Entities</h1>
        <p className="page-subtitle">Domain entities and their operations</p>
      </header>

      <div data-testid="stats-bar" className="stats-bar">
        <div className="stats-bar-item">
          <i className="ph ph-cube stats-bar-icon" aria-hidden="true" />
          <div className="stats-bar-content">
            <div className="stats-bar-label">Total Entities</div>
            <div data-testid="stat-total-entities" className="stats-bar-value">
              {entities.length}
            </div>
          </div>
        </div>
        <div className="stats-bar-item">
          <i className="ph ph-function stats-bar-icon" aria-hidden="true" />
          <div className="stats-bar-content">
            <div className="stats-bar-label">Operations</div>
            <div data-testid="stat-total-operations" className="stats-bar-value">
              {totalOperations}
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
            placeholder="Search entities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
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
                  className={`filter-tag ${selectedDomain === domain ? 'active' : ''}`}
                  onClick={() => toggleDomain(domain)}
                >
                  {domain}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {filteredEntities.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-12">
          <i
            className="ph ph-magnifying-glass text-4xl text-[var(--text-tertiary)]"
            aria-hidden="true"
          />
          <p className="text-[var(--text-secondary)]">No entities found</p>
        </div>
      ) : (
        <div data-testid="entities-list" className="space-y-4">
          {filteredEntities.map((entity) => (
            <EntityAccordion
              key={`${entity.domain}-${entity.name}`}
              entity={entity}
              onViewOnGraph={handleViewOnGraph}
            />
          ))}
        </div>
      )}
    </div>
  )
}
