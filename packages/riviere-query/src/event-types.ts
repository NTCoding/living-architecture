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

/**
 * A domain entity with its associated operations.
 */
export interface Entity {
  /** The entity name. */
  name: EntityName
  /** The domain containing the entity. */
  domain: DomainName
  /** All domain operations targeting this entity. */
  operations: DomainOpComponent[]
}

/**
 * A state transition in an entity's state machine.
 */
export interface EntityTransition {
  /** The state before the transition. */
  from: State
  /** The state after the transition. */
  to: State
  /** The operation that triggers this transition. */
  triggeredBy: OperationName
}

/**
 * An event handler that subscribes to an event.
 */
export interface EventSubscriber {
  /** The handler's component ID. */
  handlerId: HandlerId
  /** The handler's name. */
  handlerName: HandlerName
  /** The domain containing the handler. */
  domain: DomainName
}

/**
 * A published event with its subscribers.
 */
export interface PublishedEvent {
  /** The event component's ID. */
  id: EventId
  /** The event name. */
  eventName: EventName
  /** The domain that publishes the event. */
  domain: DomainName
  /** Event handlers subscribed to this event. */
  handlers: EventSubscriber[]
}

/**
 * A subscribed event where the source domain is known.
 */
export interface KnownSourceEvent {
  /** The event name. */
  eventName: EventName
  /** The domain that publishes this event. */
  sourceDomain: DomainName
  /** Indicates the source is known. */
  sourceKnown: true
}

/**
 * A subscribed event where the source domain is unknown.
 */
export interface UnknownSourceEvent {
  /** The event name. */
  eventName: EventName
  /** Indicates the source is unknown. */
  sourceKnown: false
}

/**
 * A subscribed event with optional source domain information.
 */
export type SubscribedEventWithDomain = KnownSourceEvent | UnknownSourceEvent

/**
 * Information about an event handler component.
 */
export interface EventHandlerInfo {
  /** The handler's component ID. */
  id: HandlerId
  /** The handler's name. */
  handlerName: HandlerName
  /** The domain containing the handler. */
  domain: DomainName
  /** List of event names this handler subscribes to. */
  subscribedEvents: EventName[]
  /** Subscribed events with source domain information. */
  subscribedEventsWithDomain: SubscribedEventWithDomain[]
}
