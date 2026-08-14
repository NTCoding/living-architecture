import type {
  EventComponent,
  EventHandlerComponent,
  RiviereGraph,
} from '@living-architecture/riviere-schema-published-language/schema'
import { DomainName } from './domain-name'
import { EventHandlerInfo } from './event-handler-info'
import { EventId } from './event-id'
import { EventName } from './event-name'
import { EventSubscriber } from './event-subscriber'
import { HandlerId } from './handler-id'
import { HandlerName } from './handler-name'
import { KnownSourceEvent } from './known-source-event'
import { PublishedEvent } from './published-event'
import { UnknownSourceEvent } from './unknown-source-event'

/** @riviere-role domain-service */
export function queryPublishedEvents(graph: RiviereGraph, domainName?: string): PublishedEvent[] {
  const eventComponents = graph.components.filter((c): c is EventComponent => c.type === 'Event')
  const filtered = domainName
    ? eventComponents.filter((e) => e.domain === domainName)
    : eventComponents
  const handlers = graph.components.filter(
    (c): c is EventHandlerComponent => c.type === 'EventHandler',
  )

  return filtered.map((event) => {
    const subscribers: EventSubscriber[] = handlers
      .filter((h) => h.subscribedEvents.includes(event.eventName))
      .map((h) =>
        EventSubscriber.parse({
          handlerId: HandlerId.parse(h.id),
          handlerName: HandlerName.parse(h.name),
          domain: DomainName.parse(h.domain),
        }),
      )
    return PublishedEvent.parse({
      id: EventId.parse(event.id),
      eventName: EventName.parse(event.eventName),
      domain: DomainName.parse(event.domain),
      handlers: subscribers,
    })
  })
}

/** @riviere-role domain-service */
export function queryEventHandlers(graph: RiviereGraph, eventName?: string): EventHandlerInfo[] {
  const eventByName = buildEventNameMap(graph)
  const handlers = findEventHandlerComponents(graph)
  const filtered = eventName
    ? handlers.filter((h) => h.subscribedEvents.includes(eventName))
    : handlers
  return filtered.map((h) => buildEventHandlerInfo(h, eventByName))
}

function buildEventNameMap(graph: RiviereGraph): Map<string, EventComponent> {
  return new Map(
    graph.components
      .filter((c): c is EventComponent => c.type === 'Event')
      .map((e) => [e.eventName, e]),
  )
}

function findEventHandlerComponents(graph: RiviereGraph): EventHandlerComponent[] {
  return graph.components.filter((c): c is EventHandlerComponent => c.type === 'EventHandler')
}

function buildEventHandlerInfo(
  handler: EventHandlerComponent,
  eventByName: Map<string, EventComponent>,
): EventHandlerInfo {
  const subscribedEventsWithDomain = handler.subscribedEvents.map(
    (name): KnownSourceEvent | UnknownSourceEvent => {
      const event = eventByName.get(name)
      if (event)
        return KnownSourceEvent.parse({
          eventName: EventName.parse(name),
          sourceDomain: DomainName.parse(event.domain),
          sourceKnown: true,
        })
      return UnknownSourceEvent.parse({
        eventName: EventName.parse(name),
        sourceKnown: false,
      })
    },
  )
  return EventHandlerInfo.parse({
    id: HandlerId.parse(handler.id),
    handlerName: HandlerName.parse(handler.name),
    domain: DomainName.parse(handler.domain),
    subscribedEvents: handler.subscribedEvents.map(EventName.parse),
    subscribedEventsWithDomain,
  })
}
