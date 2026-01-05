import type { DomainDetails } from './extractDomainDetails'
import { EventAccordion } from './components/EventAccordion/EventAccordion'
import { CodeLinkMenu } from '@/features/flows/components/CodeLinkMenu/CodeLinkMenu'

type DomainDetailsPublishedEvent = DomainDetails['events']['published'][number]
type DomainDetailsConsumedEvent = DomainDetails['events']['consumed'][number]

interface EventsSectionProps {
  readonly hasEvents: boolean
  readonly eventSearch: string
  readonly setEventSearch: (search: string) => void
  readonly filteredPublishedEvents: Array<DomainDetailsPublishedEvent>
  readonly filteredConsumedEvents: Array<DomainDetailsConsumedEvent>
}

export function EventsSection({
  hasEvents,
  eventSearch,
  setEventSearch,
  filteredPublishedEvents,
  filteredConsumedEvents,
}: EventsSectionProps): React.ReactElement {
  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--text-tertiary)]">
          Events{' '}
          <span className="font-normal">
            ({filteredPublishedEvents.length + filteredConsumedEvents.length})
          </span>
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
      <EventsListOrEmpty
        hasEvents={hasEvents}
        filteredPublishedEvents={filteredPublishedEvents}
        filteredConsumedEvents={filteredConsumedEvents}
      />
    </section>
  )
}

interface EventsListOrEmptyProps {
  readonly hasEvents: boolean
  readonly filteredPublishedEvents: Array<DomainDetailsPublishedEvent>
  readonly filteredConsumedEvents: Array<DomainDetailsConsumedEvent>
}

function EventsListOrEmpty({
  hasEvents,
  filteredPublishedEvents,
  filteredConsumedEvents,
}: EventsListOrEmptyProps): React.ReactElement {
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

interface PublishedEventsSectionProps {readonly events: Array<DomainDetailsPublishedEvent>}

function PublishedEventsSection({ events }: PublishedEventsSectionProps): React.ReactElement {
  return events.length === 0 ? (
    <></>
  ) : (
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

interface ConsumedEventsSectionProps {readonly events: Array<DomainDetailsConsumedEvent>}

function ConsumedEventsSection({ events }: ConsumedEventsSectionProps): React.ReactElement {
  return events.length === 0 ? (
    <></>
  ) : (
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

interface ConsumedEventItemProps {readonly handler: DomainDetailsConsumedEvent}

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
            <span className="block truncate font-[var(--font-mono)] text-sm font-bold text-[var(--text-primary)]">
              {handler.handlerName}
            </span>
            {handler.subscribedEventsWithDomain.length > 0 && (
              <span className="block text-xs text-[var(--text-tertiary)]">
                Listens to:{' '}
                {handler.subscribedEventsWithDomain
                  .map((e: (typeof handler.subscribedEventsWithDomain)[number]) =>
                    e.sourceDomain === undefined
                      ? e.eventName
                      : `${e.eventName} (${e.sourceDomain})`,
                  )
                  .join(', ')}
              </span>
            )}
          </div>
        </div>
        {sourceLocation !== undefined && sourceLocation.lineNumber !== undefined && (
          <CodeLinkMenu
            filePath={sourceLocation.filePath}
            lineNumber={sourceLocation.lineNumber}
            repository={sourceLocation.repository}
          />
        )}
      </div>
    </div>
  )
}
