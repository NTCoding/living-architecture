import type {
  DomainName, EventId, EventName, HandlerId, HandlerName 
} from './branded-types'

export { Entity } from './entity'
export type { EntityTransition } from './entity'

export interface EventSubscriber {
  handlerId: HandlerId
  handlerName: HandlerName
  domain: DomainName
}

export interface PublishedEvent {
  id: EventId
  eventName: EventName
  domain: DomainName
  handlers: EventSubscriber[]
}

export interface KnownSourceEvent {
  eventName: EventName
  sourceDomain: DomainName
  sourceKnown: true
}

export interface UnknownSourceEvent {
  eventName: EventName
  sourceKnown: false
}

export type SubscribedEventWithDomain = KnownSourceEvent | UnknownSourceEvent

export interface EventHandlerInfo {
  id: HandlerId
  handlerName: HandlerName
  domain: DomainName
  subscribedEvents: EventName[]
  subscribedEventsWithDomain: SubscribedEventWithDomain[]
}
