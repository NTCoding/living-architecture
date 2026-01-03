import { useMemo } from 'react'
import type { NodeType } from '@/types/riviere'
import type { DomainDetails } from './extractDomainDetails'
import { NodeTypeBadge } from '@/features/flows/components/NodeTypeBadge/NodeTypeBadge'
import { CodeLinkMenu } from '@/features/flows/components/CodeLinkMenu/CodeLinkMenu'
import { EntityAccordion } from './components/EntityAccordion/EntityAccordion'
import { EventAccordion } from './components/EventAccordion/EventAccordion'

type DomainDetailsNode = DomainDetails['nodes'][number]
type DomainDetailsEntity = DomainDetails['entities'][number]
type DomainDetailsPublishedEvent = DomainDetails['events']['published'][number]
type DomainDetailsConsumedEvent = DomainDetails['events']['consumed'][number]
export type NodeTypeFilter = NodeType | 'all'
const NODE_TYPES: NodeType[] = ['UI', 'API', 'UseCase', 'DomainOp', 'Event', 'EventHandler', 'Custom']
interface DomainDetailViewProps {
  readonly domain: DomainDetails
  readonly nodeSearch: string
  readonly setNodeSearch: (search: string) => void
  readonly nodeTypeFilter: NodeTypeFilter
  readonly setNodeTypeFilter: (filter: NodeTypeFilter) => void
  readonly entitySearch: string
  readonly setEntitySearch: (search: string) => void
  readonly eventSearch: string
  readonly setEventSearch: (search: string) => void
}

export function DomainDetailView({
  domain,
  nodeSearch,
  setNodeSearch,
  nodeTypeFilter,
  setNodeTypeFilter,
  entitySearch,
  setEntitySearch,
  eventSearch,
  setEventSearch
}: DomainDetailViewProps): React.ReactElement {
  const filteredNodes = useMemo(() => {
    return domain.nodes.filter((node) => {
      const matchesSearch = nodeSearch === '' || node.name.toLowerCase().includes(nodeSearch.toLowerCase())
      const matchesType = nodeTypeFilter === 'all' || node.type === nodeTypeFilter
      return matchesSearch && matchesType
    })
  }, [domain.nodes, nodeSearch, nodeTypeFilter])

  const filteredEntities = useMemo(() => {
    return entitySearch === ''
      ? domain.entities
      : domain.entities.filter((entity) =>
        entity.name.toLowerCase().includes(entitySearch.toLowerCase())
      )
  }, [domain.entities, entitySearch])

  const filteredPublishedEvents = useMemo(() => {
    return eventSearch === ''
      ? domain.events.published
      : domain.events.published.filter((evt) =>
        evt.eventName.toLowerCase().includes(eventSearch.toLowerCase())
      )
  }, [domain.events.published, eventSearch])

  const filteredConsumedEvents = useMemo(() => {
    return eventSearch === ''
      ? domain.events.consumed
      : domain.events.consumed.filter((handler) =>
        handler.handlerName.toLowerCase().includes(eventSearch.toLowerCase()) ||
        handler.subscribedEvents.some((e) => e.toLowerCase().includes(eventSearch.toLowerCase()))
      )
  }, [domain.events.consumed, eventSearch])

  const hasEvents = domain.events.published.length > 0 || domain.events.consumed.length > 0
  const operationsCount = domain.entities.reduce((sum, e) => sum + e.operations.length, 0)
  const eventsCount = domain.events.published.length + domain.events.consumed.length

  return (
    <>
      <StatisticsRow entities={domain.entities.length} operations={operationsCount} events={eventsCount} />
      <NodesSection filteredNodes={filteredNodes} domain={domain} nodeSearch={nodeSearch} setNodeSearch={setNodeSearch} nodeTypeFilter={nodeTypeFilter} setNodeTypeFilter={setNodeTypeFilter} />
      <EntitiesSection filteredEntities={filteredEntities} domain={domain} entitySearch={entitySearch} setEntitySearch={setEntitySearch} />
      <EventsSection hasEvents={hasEvents} eventSearch={eventSearch} setEventSearch={setEventSearch} filteredPublishedEvents={filteredPublishedEvents} filteredConsumedEvents={filteredConsumedEvents} />
    </>
  )
}
interface StatisticsRowProps {
  readonly entities: number
  readonly operations: number
  readonly events: number
}
function StatisticsRow({ entities, operations, events }: StatisticsRowProps): React.ReactElement {
  return (
    <div data-testid="stats-row" className="flex gap-6 rounded-[var(--radius)] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4">
      <div className="flex items-center gap-3 border-r border-[var(--border-color)] pr-6"><i className="ph ph-cube text-xl text-[var(--primary)]" aria-hidden="true" /><div className="flex flex-col gap-0.5"><span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Entities</span><span className="font-[var(--font-heading)] text-xl font-bold text-[var(--text-primary)]">{entities}</span></div></div>
      <div className="flex items-center gap-3 border-r border-[var(--border-color)] pr-6"><i className="ph ph-gear text-xl text-[var(--primary)]" aria-hidden="true" /><div className="flex flex-col gap-0.5"><span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Operations</span><span className="font-[var(--font-heading)] text-xl font-bold text-[var(--text-primary)]">{operations}</span></div></div>
      <div className="flex items-center gap-3"><i className="ph ph-broadcast text-xl text-[var(--primary)]" aria-hidden="true" /><div className="flex flex-col gap-0.5"><span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Events</span><span className="font-[var(--font-heading)] text-xl font-bold text-[var(--text-primary)]">{events}</span></div></div>
    </div>
  )
}
interface NodesSectionProps {
  readonly filteredNodes: Array<DomainDetailsNode>
  readonly domain: DomainDetails
  readonly nodeSearch: string
  readonly setNodeSearch: (search: string) => void
  readonly nodeTypeFilter: NodeTypeFilter
  readonly setNodeTypeFilter: (filter: NodeTypeFilter) => void
}
function NodesSection({ filteredNodes, domain, nodeSearch, setNodeSearch, nodeTypeFilter, setNodeTypeFilter }: NodesSectionProps): React.ReactElement {
  return (
    <section data-testid="detail-panel">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--text-tertiary)]">
          Nodes <span className="font-normal">({filteredNodes.length})</span>
        </h2>
      </div>
      <NodeFilterBar nodeSearch={nodeSearch} setNodeSearch={setNodeSearch} nodeTypeFilter={nodeTypeFilter} setNodeTypeFilter={setNodeTypeFilter} />
      <NodesListOrEmpty filteredNodes={filteredNodes} domain={domain} />
    </section>
  )
}

interface NodeFilterBarProps {
  readonly nodeSearch: string
  readonly setNodeSearch: (search: string) => void
  readonly nodeTypeFilter: NodeTypeFilter
  readonly setNodeTypeFilter: (filter: NodeTypeFilter) => void
}
function NodeFilterBar({ nodeSearch, setNodeSearch, nodeTypeFilter, setNodeTypeFilter }: NodeFilterBarProps): React.ReactElement {
  return (
    <div data-testid="filters-section" className="filters-section mb-4">
      <div className="search-container">
        <i className="ph ph-magnifying-glass search-icon" aria-hidden="true" />
        <input
          type="text"
          className="search-input"
          placeholder="Search nodes..."
          value={nodeSearch}
          onChange={(e) => setNodeSearch(e.target.value)}
        />
      </div>
      <div className="filter-divider" />
      <span className="filter-label">Type:</span>
      <div className="filter-group">
        <button
          type="button"
          className={`filter-tag ${nodeTypeFilter === 'all' ? 'active' : ''}`}
          onClick={() => setNodeTypeFilter('all')}
        >
          All
        </button>
        {NODE_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            className={`filter-tag ${nodeTypeFilter === type ? 'active' : ''}`}
            onClick={() => setNodeTypeFilter(type)}
          >
            {type}
          </button>
        ))}
      </div>
    </div>
  )
}

interface NodesListOrEmptyProps {
  readonly filteredNodes: Array<DomainDetailsNode>
  readonly domain: DomainDetails
}
function NodesListOrEmpty({ filteredNodes, domain }: NodesListOrEmptyProps): React.ReactElement {
  if (filteredNodes.length > 0) {
    return (
      <div data-testid="nodes-list" className="max-h-[320px] space-y-2 overflow-y-auto">
        {filteredNodes.map((node) => (
          <NodeListItem key={node.id} node={node} />
        ))}
      </div>
    )
  }

  return (
    <p className="text-sm italic text-[var(--text-tertiary)]">
      {domain.nodes.length > 0 ? 'No nodes match your search' : 'No nodes in this domain'}
    </p>
  )
}

interface NodeListItemProps {
  readonly node: DomainDetailsNode
}
function NodeListItem({ node }: NodeListItemProps): React.ReactElement {
  const sourceLocation = node.sourceLocation
  const hasSourceLocation = sourceLocation !== undefined && sourceLocation.lineNumber !== undefined
  const hasNodeLocation = node.location !== undefined

  const showCodeLink = hasSourceLocation
  const showNodeLocation = !hasSourceLocation && hasNodeLocation

  const renderNodeAction = (): React.ReactElement | null => {
    if (showCodeLink) {
      return (
        <CodeLinkMenu
          filePath={sourceLocation.filePath}
          lineNumber={sourceLocation.lineNumber}
          repository={sourceLocation.repository}
        />
      )
    }
    if (showNodeLocation) {
      return (
        <span className="max-w-[200px] shrink-0 truncate text-xs text-[var(--text-tertiary)]" title={node.location}>
          {node.location}
        </span>
      )
    }
    return null
  }
  const nodeAction = renderNodeAction()

  return (
    <div className="flex items-center justify-between gap-4 rounded-[var(--radius)] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-2 shadow-sm">
      <div className="flex min-w-0 items-center gap-3">
        <NodeTypeBadge type={node.type} />
        <span className="truncate text-sm font-medium text-[var(--text-primary)]">{node.name}</span>
      </div>
      {nodeAction}
    </div>
  )
}

interface EntitiesSectionProps {
  readonly filteredEntities: Array<DomainDetailsEntity>
  readonly domain: DomainDetails
  readonly entitySearch: string
  readonly setEntitySearch: (search: string) => void
}
function EntitiesSection({ filteredEntities, domain, entitySearch, setEntitySearch }: EntitiesSectionProps): React.ReactElement {
  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--text-tertiary)]">
          Entities <span className="font-normal">({filteredEntities.length})</span>
        </h2>
      </div>
      {domain.entities.length > 0 && (
        <div className="mb-4 flex items-center gap-2">
          <div className="search-container flex-1">
            <i className="ph ph-magnifying-glass search-icon" aria-hidden="true" />
            <input
              type="text"
              className="search-input"
              placeholder="Search entities..."
              value={entitySearch}
              onChange={(e) => setEntitySearch(e.target.value)}
            />
          </div>
        </div>
      )}
      <EntitiesListOrEmpty filteredEntities={filteredEntities} domain={domain} />
    </section>
  )
}

interface EntitiesListOrEmptyProps {
  readonly filteredEntities: Array<DomainDetailsEntity>
  readonly domain: DomainDetails
}
function EntitiesListOrEmpty({ filteredEntities, domain }: EntitiesListOrEmptyProps): React.ReactElement {
  if (filteredEntities.length > 0) {
    return (
      <div className="max-h-[320px] space-y-3 overflow-y-auto">
        {filteredEntities.map((entity) => (
          <EntityAccordion
            key={entity.name}
            entity={entity}
          />
        ))}
      </div>
    )
  }

  if (domain.entities.length > 0) {
    return <p className="text-sm italic text-[var(--text-tertiary)]">No entities match your search</p>
  }

  return <p className="text-sm italic text-[var(--text-tertiary)]">No entities in this domain</p>
}

interface EventsSectionProps {
  readonly hasEvents: boolean
  readonly eventSearch: string
  readonly setEventSearch: (search: string) => void
  readonly filteredPublishedEvents: Array<DomainDetailsPublishedEvent>
  readonly filteredConsumedEvents: Array<DomainDetailsConsumedEvent>
}
function EventsSection({
  hasEvents,
  eventSearch,
  setEventSearch,
  filteredPublishedEvents,
  filteredConsumedEvents
}: EventsSectionProps): React.ReactElement {
  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--text-tertiary)]">
          Events <span className="font-normal">({filteredPublishedEvents.length + filteredConsumedEvents.length})</span>
        </h2>
      </div>
      {hasEvents && (
        <div className="mb-4 flex items-center gap-2">
          <div className="search-container flex-1">
            <i className="ph ph-magnifying-glass search-icon" aria-hidden="true" />
            <input
              type="text"
              className="search-input"
              placeholder="Search events..."
              value={eventSearch}
              onChange={(e) => setEventSearch(e.target.value)}
            />
          </div>
        </div>
      )}
      <EventsListOrEmpty hasEvents={hasEvents} filteredPublishedEvents={filteredPublishedEvents} filteredConsumedEvents={filteredConsumedEvents} />
    </section>
  )
}

interface EventsListOrEmptyProps {
  readonly hasEvents: boolean
  readonly filteredPublishedEvents: Array<DomainDetailsPublishedEvent>
  readonly filteredConsumedEvents: Array<DomainDetailsConsumedEvent>
}
function EventsListOrEmpty({ hasEvents, filteredPublishedEvents, filteredConsumedEvents }: EventsListOrEmptyProps): React.ReactElement {
  if (!hasEvents) {
    return <p className="text-sm italic text-[var(--text-tertiary)]">No events in this domain</p>
  }

  return (
    <div className="max-h-[400px] space-y-4 overflow-y-auto">
      <PublishedEventsSection events={filteredPublishedEvents} />
      <ConsumedEventsSection events={filteredConsumedEvents} />
      {filteredPublishedEvents.length === 0 && filteredConsumedEvents.length === 0 && (
        <p className="text-sm italic text-[var(--text-tertiary)]">No events match your search</p>
      )}
    </div>
  )
}

interface PublishedEventsSectionProps {
  readonly events: Array<DomainDetailsPublishedEvent>
}
function PublishedEventsSection({ events }: PublishedEventsSectionProps): React.ReactElement {
  return events.length === 0 ? <></> : (
    <div data-testid="published-events">
      <h3 className="mb-2 text-xs font-semibold text-[var(--text-secondary)]">Published</h3>
      <div className="space-y-3">
        {events.map((evt) => (
          <EventAccordion key={evt.id} event={evt} />
        ))}
      </div>
    </div>
  )
}

interface ConsumedEventsSectionProps {
  readonly events: Array<DomainDetailsConsumedEvent>
}
function ConsumedEventsSection({ events }: ConsumedEventsSectionProps): React.ReactElement {
  return events.length === 0 ? <></> : (
    <div data-testid="consumed-events">
      <h3 className="mb-2 text-xs font-semibold text-[var(--text-secondary)]">Consumed</h3>
      <div className="space-y-3">
        {events.map((handler) => (
          <ConsumedEventItem key={handler.id} handler={handler} />
        ))}
      </div>
    </div>
  )
}

interface ConsumedEventItemProps {
  readonly handler: DomainDetailsConsumedEvent
}
function ConsumedEventItem({ handler }: ConsumedEventItemProps): React.ReactElement {
  const sourceLocation = handler.sourceLocation
  return (
    <div className="overflow-hidden rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-sm">
      <div className="flex items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--text-secondary)] to-[#64748B] text-white">
            <i className="ph ph-ear text-lg" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <span className="block truncate font-[var(--font-mono)] text-sm font-bold text-[var(--text-primary)]">{handler.handlerName}</span>
            {handler.subscribedEventsWithDomain.length > 0 && (
              <span className="block text-xs text-[var(--text-tertiary)]">
                Listens to: {handler.subscribedEventsWithDomain.map((e: typeof handler.subscribedEventsWithDomain[number]) => e.sourceDomain === undefined ? e.eventName : `${e.eventName} (${e.sourceDomain})`).join(', ')}
              </span>
            )}
          </div>
        </div>
        {sourceLocation !== undefined && sourceLocation.lineNumber !== undefined && (
          <CodeLinkMenu filePath={sourceLocation.filePath} lineNumber={sourceLocation.lineNumber} repository={sourceLocation.repository} />
        )}
      </div>
    </div>
  )
}