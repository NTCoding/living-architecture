import {
 useMemo, useState 
} from 'react';
import { Link } from 'react-router-dom';
import type {
 RiviereGraph, SystemType, DomainName 
} from '@/types/riviere';
import { domainNameSchema } from '@/types/riviere';
import { useRiviereQuery } from '@/hooks/useRiviereQuery';
import { useCodeLinkSettings } from '@/features/flows/components/CodeLinkMenu/useCodeLinkSettings';
import { StatsItem } from './StatsItem';

type ViewMode = 'grid' | 'list'
type FilterType = 'all' | SystemType

interface NodeBreakdown {
  UI: number
  API: number
  UseCase: number
  DomainOp: number
  Event: number
  EventHandler: number
  Custom: number
}

interface DomainInfo {
  id: DomainName
  description: string
  systemType: SystemType
  nodeBreakdown: NodeBreakdown
  entities: string[]
  entryPoints: string[]
  repository: string | undefined
}

interface OverviewPageProps {graph: RiviereGraph}

export function OverviewPage({ graph }: Readonly<OverviewPageProps>): React.ReactElement {
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')
  const query = useRiviereQuery(graph)

  const {
 stats, allDomains 
} = useMemo(() => {
    if (query === null) {
      return {
        stats: {
 totalNodes: 0,
totalDomains: 0,
totalApis: 0,
totalEntities: 0,
totalEvents: 0 
},
        allDomains: [],
      }
    }

    const queryStats = query.stats()
    const domains = query.domains()
    const allEntities = query.entities()

    const domainInfos: DomainInfo[] = domains.map((domain) => {
      const domainId = domainNameSchema.parse(domain.name)
      const domainComponents = query.componentsInDomain(domain.name)

      const entryPoints: string[] = []
      for (const node of domainComponents) {
        if (node.type === 'UI') {
          entryPoints.push(node.route)
        } else if (node.type === 'API' && node.path !== undefined) {
          entryPoints.push(node.path)
        }
      }

      const repository = domainComponents
        .find((node) => node.sourceLocation != null)
        ?.sourceLocation?.repository

      const entities = allEntities
        .filter((e) => e.domain === domain.name)
        .map((e) => e.name)

      return {
        id: domainId,
        description: domain.description,
        systemType: domain.systemType,
        nodeBreakdown: domain.componentCounts,
        entities,
        entryPoints,
        repository,
      }
    })

    return {
      stats: {
        totalNodes: queryStats.componentCount,
        totalDomains: queryStats.domainCount,
        totalApis: queryStats.apiCount,
        totalEntities: queryStats.entityCount,
        totalEvents: queryStats.eventCount,
      },
      allDomains: domainInfos,
    }
  }, [query])

  const filteredDomains = allDomains.filter((domain) => {
    const matchesSearch = domain.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      domain.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = activeFilter === 'all' || domain.systemType === activeFilter
    return matchesSearch && matchesFilter
  })

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-[var(--font-heading)] text-2xl font-bold text-[var(--text-primary)]">
          Overview
        </h1>
        <p className="text-[var(--text-secondary)]">
          Architecture summary and quick access
        </p>
      </header>

      <div className="flex flex-wrap gap-4 rounded-[var(--radius)] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 md:flex-nowrap md:gap-6">
        <StatsItem icon="graph" label="Nodes" value={stats.totalNodes} />
        <StatsItem icon="folder" label="Domains" value={stats.totalDomains} />
        <StatsItem icon="plug" label="APIs" value={stats.totalApis} />
        <StatsItem icon="cube" label="Entities" value={stats.totalEntities} />
        <StatsItem icon="broadcast" label="Events" value={stats.totalEvents} />
      </div>

      <div className="filters-section">
        <div className="search-container">
          <i className="ph ph-magnifying-glass search-icon" aria-hidden="true" />
          <input
            type="text"
            className="search-input"
            placeholder="Search domains..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="filter-divider" />
        <span className="filter-label">Type:</span>
        <div className="filter-group">
          <button
            className={`filter-tag ${activeFilter === 'all' ? 'active' : ''}`}
            onClick={() => setActiveFilter('all')}
          >
            All
          </button>
          <button
            className={`filter-tag ${activeFilter === 'domain' ? 'active' : ''}`}
            onClick={() => setActiveFilter('domain')}
          >
            Domain
          </button>
          <button
            className={`filter-tag ${activeFilter === 'ui' ? 'active' : ''}`}
            onClick={() => setActiveFilter('ui')}
          >
            UI
          </button>
          <button
            className={`filter-tag ${activeFilter === 'bff' ? 'active' : ''}`}
            onClick={() => setActiveFilter('bff')}
          >
            BFF
          </button>
        </div>
      </div>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-[var(--font-heading)] text-xl font-bold text-[var(--text-primary)]">
            Domains
          </h2>
          <div className="view-mode-switcher">
            <button
              className={`view-mode-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
            >
              <i className="ph ph-squares-four" aria-hidden="true" />
              Grid
            </button>
            <button
              className={`view-mode-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
            >
              <i className="ph ph-list" aria-hidden="true" />
              List
            </button>
          </div>
        </div>
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3' : 'flex flex-col gap-3'}>
          {filteredDomains.map((domain) => (
            <DomainCard
              key={domain.id}
              domain={domain}
              viewMode={viewMode}
              graphName={graph.metadata.name}
            />
          ))}
        </div>
      </section>
    </div>
  )
}

interface DomainCardProps {
  readonly domain: DomainInfo
  readonly viewMode: ViewMode
  readonly graphName: string | undefined
}

function DomainCard({
 domain, viewMode, graphName 
}: Readonly<DomainCardProps>): React.ReactElement {
  const repoName: string | undefined = domain.repository === undefined ? graphName : domain.repository
  const { settings } = useCodeLinkSettings()
  const githubUrl = repoName === undefined || settings.githubOrg === null ? null : `${settings.githubOrg.replace(/\/$/, '')}/${repoName}`

  if (viewMode === 'list') {
    return (
      <article
        data-testid={`domain-card-${domain.id}`}
        className="relative flex items-center gap-6 rounded-[var(--radius)] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-5 py-4 transition-all hover:border-[var(--primary)] hover:shadow-[var(--shadow)]"
      >
        <Link to={`/domains/${domain.id}`} data-card-link className="absolute inset-0 z-0" aria-label={`View ${domain.id} details`} />
        <div className="relative z-10 min-w-0 flex-1">
          <h3 className="text-base font-bold text-[var(--text-primary)]">{domain.id}</h3>
          <p className="truncate text-xs text-[var(--text-tertiary)]">
            {domain.description}
          </p>
        </div>
        <div className="relative z-10 flex shrink-0 items-center gap-2">
          {githubUrl !== null && (
            <a href={githubUrl} target="_blank" rel="noopener noreferrer" className="icon-btn" title={`View source: ${repoName}`} aria-label={`View source code for ${domain.id}`}>
              <i className="ph ph-github-logo" aria-hidden="true" />
            </a>
          )}
          <Link
            to={`/domains/${domain.id}`}
            className="icon-btn"
            title="View Details"
            aria-label={`View details for ${domain.id}`}
          >
            <i className="ph ph-info" aria-hidden="true" />
          </Link>
          <Link
            to={`/domains?highlight=${domain.id}`}
            className="icon-btn-accent"
            title="View on Domain Map"
            aria-label={`View ${domain.id} on Domain Map`}
          >
            <i className="ph ph-map-trifold" aria-hidden="true" />
          </Link>
        </div>
      </article>
    )
  }

  return (
    <article
      data-testid={`domain-card-${domain.id}`}
      className="relative flex h-full flex-col rounded-[var(--radius)] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5 transition-all hover:-translate-y-0.5 hover:border-[var(--primary)] hover:shadow-[var(--shadow)]"
    >
      <Link to={`/domains/${domain.id}`} data-card-link className="absolute inset-0 z-0" aria-label={`View ${domain.id} details`} />
      <header className="relative z-10 mb-3">
        <h3 className="text-base font-bold text-[var(--text-primary)]">{domain.id}</h3>
        <p className="line-clamp-2 text-xs leading-relaxed text-[var(--text-tertiary)]">
          {domain.description}
        </p>
      </header>

      <NodeBreakdownSection breakdown={domain.nodeBreakdown} />

      {domain.entities.length > 0 && (
        <EntitiesSection entities={domain.entities} />
      )}

      {domain.entryPoints.length > 0 && (
        <EntryPointsSection entryPoints={domain.entryPoints} />
      )}

      <footer className="relative z-10 mt-auto flex items-center justify-between border-t border-[var(--border-color)] pt-3">
        {githubUrl === null ? (
          <span />
        ) : (
          <a
            href={githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] transition-colors hover:text-[var(--primary)]"
            aria-label={`GitHub repository ${repoName}`}
          >
            <i className="ph ph-github-logo text-sm" aria-hidden="true" />
            <span>{repoName}</span>
          </a>
        )}
        <div className="flex items-center gap-2">
          <Link
            to={`/domains/${domain.id}`}
            className="icon-btn"
            title="View Details"
            aria-label={`View details for ${domain.id}`}
          >
            <i className="ph ph-info" aria-hidden="true" />
          </Link>
          <Link
            to={`/domains?highlight=${domain.id}`}
            className="icon-btn-accent"
            title="View on Domain Map"
            aria-label={`View ${domain.id} on Domain Map`}
          >
            <i className="ph ph-map-trifold" aria-hidden="true" />
          </Link>
        </div>
      </footer>
    </article>
  )
}

interface NodeBreakdownSectionProps {readonly breakdown: DomainInfo['nodeBreakdown']}

function NodeBreakdownSection({ breakdown }: Readonly<NodeBreakdownSectionProps>): React.ReactElement {
  const items = [
    {
 label: 'UI',
value: breakdown.UI 
},
    {
 label: 'API',
value: breakdown.API 
},
    {
 label: 'UseCase',
value: breakdown.UseCase 
},
    {
 label: 'DomainOp',
value: breakdown.DomainOp 
},
    {
 label: 'Event',
value: breakdown.Event 
},
    {
 label: 'Handler',
value: breakdown.EventHandler 
},
  ].filter((item) => item.value > 0)

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
            <span className="font-medium text-[var(--text-secondary)]">{item.label}</span>
            <span className="font-bold text-[var(--text-primary)]">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const DISPLAY_LIMIT = 3

interface EntitiesSectionProps {readonly entities: readonly string[]}

function EntitiesSection({ entities }: Readonly<EntitiesSectionProps>): React.ReactElement {
  const displayedEntities = entities.slice(0, DISPLAY_LIMIT)
  const hasMore = entities.length > DISPLAY_LIMIT

  return (
    <div className="mb-3 border-b border-[var(--border-color)] pb-3">
      <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[var(--text-tertiary)]">
        Entities
      </h4>
      <div className="flex flex-wrap gap-1.5">
        {displayedEntities.map((entity) => (
          <span
            key={entity}
            className="max-w-full truncate rounded border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-2 py-1 font-[var(--font-mono)] text-[11px] font-semibold text-[var(--text-primary)]"
          >
            {entity}
          </span>
        ))}
        {hasMore && (
          <span className="text-[11px] text-[var(--text-tertiary)]" aria-label={`${entities.length - DISPLAY_LIMIT} more entities`}>
            …
          </span>
        )}
      </div>
    </div>
  )
}

interface EntryPointsSectionProps {readonly entryPoints: readonly string[]}

function EntryPointsSection({ entryPoints }: Readonly<EntryPointsSectionProps>): React.ReactElement {
  const displayedEntryPoints = entryPoints.slice(0, DISPLAY_LIMIT)
  const hasMore = entryPoints.length > DISPLAY_LIMIT

  return (
    <div className="pb-0">
      <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[var(--text-tertiary)]">
        Entry Points ({entryPoints.length})
      </h4>
      <div className="flex flex-col gap-1">
        {displayedEntryPoints.map((path) => (
          <div
            key={path}
            className="truncate rounded bg-[var(--bg-tertiary)] px-2 py-1 font-[var(--font-mono)] text-[11px] text-[var(--text-secondary)]"
          >
            {path}
          </div>
        ))}
        {hasMore && (
          <span className="text-[11px] text-[var(--text-tertiary)]" aria-label={`${entryPoints.length - DISPLAY_LIMIT} more entry points`}>
            …
          </span>
        )}
      </div>
    </div>
  )
}
