import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { RiviereQuery } from '@living-architecture/riviere-query'
import type { Entity } from '@living-architecture/riviere-query'
import type { RiviereGraph } from '@/types/riviere'
import { EntityAccordion } from '../domains/components/EntityAccordion/EntityAccordion'

interface EntitiesPageProps {
  readonly graph: RiviereGraph
}

export function EntitiesPage({ graph }: Readonly<EntitiesPageProps>): React.ReactElement {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDomain, setSelectedDomain] = useState<string>('all')

  const handleViewOnGraph = useCallback((nodeId: string) => {
    navigate(`/full-graph?node=${nodeId}`)
  }, [navigate])

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-[var(--font-heading)] text-3xl font-bold text-[var(--text-primary)]">
            Entities
          </h1>
          <p className="mt-1 text-[var(--text-secondary)]">
            {filteredEntities.length} {filteredEntities.length === 1 ? 'entity' : 'entities'} found
          </p>
        </div>
      </div>

      <div className="space-y-4 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <input
            type="text"
            placeholder="Search entities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-3 py-2 text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:border-[var(--primary)] focus:outline-none"
          />

          <select
            value={selectedDomain}
            onChange={(e) => setSelectedDomain(e.target.value)}
            className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-3 py-2 text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none"
          >
            <option value="all">All Domains</option>
            {domains.map((domain) => (
              <option key={domain} value={domain}>
                {domain}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filteredEntities.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-12">
          <i className="ph ph-magnifying-glass text-4xl text-[var(--text-tertiary)]" aria-hidden="true" />
          <p className="text-[var(--text-secondary)]">No entities found</p>
        </div>
      ) : (
        <div data-testid="entities-list" className="space-y-4">
          {filteredEntities.map((entity) => (
            <EntityAccordion key={`${entity.domain}-${entity.name}`} entity={entity} onViewOnGraph={handleViewOnGraph} />
          ))}
        </div>
      )}
    </div>
  )
}
