import { useMemo, useState, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { RiviereGraph } from '@/types/riviere'
import { EventAccordion } from '@/features/domains/components/EventAccordion'
import type { DomainEvent } from '@/features/domains/extractDomainDetails'

function isValidSchemaObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

interface EventsPageProps {
  graph: RiviereGraph
}

interface PublishedEvent extends DomainEvent {
  domain: string
}

export function EventsPage({ graph }: EventsPageProps): React.ReactElement {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [searchQuery, setSearchQuery] = useState('')
  const [activeDomains, setActiveDomains] = useState<Set<string>>(new Set())

  const handleViewOnGraph = useCallback((eventId: string) => {
    const demo = searchParams.get('demo')
    const demoParam = demo === 'true' ? '&demo=true' : ''
    navigate(`/full-graph?node=${eventId}${demoParam}`)
  }, [navigate, searchParams])

  const { publishedEvents, domains } = useMemo(() => {
    const published: PublishedEvent[] = []
    const domainSet = new Set<string>()

    const eventNodes = graph.components.filter((node) => node.type === 'Event')
    const eventHandlerNodes = graph.components.filter((node) => node.type === 'EventHandler')

    eventNodes.forEach((eventNode) => {
      domainSet.add(eventNode.domain)

      const eventHandlers = eventHandlerNodes
        .filter((handler) => {
          const subscribedEvents = handler.subscribedEvents
          if (subscribedEvents === undefined) return false
          return subscribedEvents.some((eventName) =>
            eventName === eventNode.name ||
            eventNode.id.includes(eventName)
          )
        })
        .map((h) => ({
          domain: h.domain,
          handlerName: h.name,
        }))

      const schema = eventNode.metadata?.['schema']
      const payloadSchema = isValidSchemaObject(schema) ? schema : undefined

      published.push({
        id: eventNode.id,
        eventName: eventNode.name,
        schema: payloadSchema,
        sourceLocation: eventNode.sourceLocation,
        handlers: eventHandlers,
        domain: eventNode.domain,
      })
    })

    return {
      publishedEvents: published.sort((a, b) => {
        const domainCompare = a.domain.localeCompare(b.domain)
        if (domainCompare !== 0) return domainCompare
        return a.eventName.localeCompare(b.eventName)
      }),
      domains: Array.from(domainSet).sort(),
    }
  }, [graph])

  const filteredPublished = useMemo(() => {
    return publishedEvents.filter((event) => {
      const matchesSearch =
        searchQuery === '' ||
        event.eventName.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesDomain =
        activeDomains.size === 0 || activeDomains.has(event.domain)
      return matchesSearch && matchesDomain
    })
  }, [publishedEvents, searchQuery, activeDomains])

  const totalEvents = publishedEvents.length
  const eventNodeIds = new Set(graph.components.filter(n => n.type === 'Event').map(n => n.id))
  const uniquePublishers = new Set(
    graph.links
      .filter((edge) => eventNodeIds.has(edge.target))
      .map((edge) => edge.source)
  ).size

  const toggleDomain = (domain: string): void => {
    setActiveDomains((prev) => {
      const next = new Set(prev)
      if (next.has(domain)) {
        next.delete(domain)
      } else {
        next.add(domain)
      }
      return next
    })
  }

  return (
    <div data-testid="events-page" className="space-y-6">
      <header className="page-header">
        <h1 className="page-title">Events</h1>
        <p className="page-subtitle">Domain events and cross-domain event flows</p>
      </header>

      <div data-testid="stats-bar" className="stats-bar">
        <div className="stats-bar-item">
          <i className="ph ph-broadcast stats-bar-icon" aria-hidden="true" />
          <div className="stats-bar-content">
            <div className="stats-bar-label">Total Events</div>
            <div data-testid="stat-total-events" className="stats-bar-value">
              {totalEvents}
            </div>
          </div>
        </div>
        <div className="stats-bar-item">
          <i className="ph ph-paper-plane-tilt stats-bar-icon" aria-hidden="true" />
          <div className="stats-bar-content">
            <div className="stats-bar-label">Publishers</div>
            <div data-testid="stat-publishers" className="stats-bar-value">
              {uniquePublishers}
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
            placeholder="Search events..."
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

      <div className="max-h-[600px] space-y-4 overflow-y-auto">
        {filteredPublished.length > 0 ? (
          <section data-testid="published-events">
            <div className="space-y-3">
              {filteredPublished.map((event) => (
                <EventAccordion key={event.id} event={event} onViewOnGraph={handleViewOnGraph} />
              ))}
            </div>
          </section>
        ) : (
          <p className="text-sm italic text-[var(--text-tertiary)]">
            {publishedEvents.length > 0
              ? 'No events match your search'
              : 'No events in this graph'}
          </p>
        )}
      </div>
    </div>
  )
}
