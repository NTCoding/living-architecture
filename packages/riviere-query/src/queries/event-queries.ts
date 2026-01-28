import type {
  RiviereGraph,
  EventComponent,
  EventHandlerComponent,
} from '@living-architecture/riviere-schema'
import type {
  PublishedEvent,
  EventSubscriber,
  EventHandlerInfo,
  KnownSourceEvent,
  UnknownSourceEvent,
} from './event-types'
import {
  parseDomainName,
  parseEventId,
  parseEventName,
  parseHandlerId,
  parseHandlerName,
} from './branded-types'

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
      .map((h) => ({
        handlerId: parseHandlerId(h.id),
        handlerName: parseHandlerName(h.name),
        domain: parseDomainName(h.domain),
      }))
    return {
      id: parseEventId(event.id),
      eventName: parseEventName(event.eventName),
      domain: parseDomainName(event.domain),
      handlers: subscribers,
    }
  })
}

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
        return {
          eventName: parseEventName(name),
          sourceDomain: parseDomainName(event.domain),
          sourceKnown: true,
        }
      return {
        eventName: parseEventName(name),
        sourceKnown: false,
      }
    },
  )
  return {
    id: parseHandlerId(handler.id),
    handlerName: parseHandlerName(handler.name),
    domain: parseDomainName(handler.domain),
    subscribedEvents: handler.subscribedEvents.map(parseEventName),
    subscribedEventsWithDomain,
  }
}
