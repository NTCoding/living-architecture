import type { DomainOpComponent } from '@living-architecture/riviere-schema'
import type {
  EntityName,
  DomainName,
  State,
  OperationName,
  EventId,
  EventName,
  HandlerId,
  HandlerName,
} from './domain-types'

export interface Entity {
  name: EntityName
  domain: DomainName
  operations: DomainOpComponent[]
}

export interface EntityTransition {
  from: State
  to: State
  triggeredBy: OperationName
}

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
