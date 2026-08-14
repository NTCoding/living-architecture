import type { DomainName } from './domain-name'
import type { EventName } from './event-name'
import type { HandlerId } from './handler-id'
import type { HandlerName } from './handler-name'
import { KnownSourceEvent } from './known-source-event'
import { UnknownSourceEvent } from './unknown-source-event'

type SubscribedEventWithDomain = KnownSourceEvent | UnknownSourceEvent

/**
 * Information about an event handler component.
 * @riviere-role value-object
 */
export class EventHandlerInfo {
  declare private readonly brand: 'EventHandlerInfo'
  readonly id: HandlerId
  readonly handlerName: HandlerName
  readonly domain: DomainName
  readonly subscribedEvents: EventName[]
  readonly subscribedEventsWithDomain: SubscribedEventWithDomain[]

  private constructor(input: {
    readonly id: HandlerId
    readonly handlerName: HandlerName
    readonly domain: DomainName
    readonly subscribedEvents: EventName[]
    readonly subscribedEventsWithDomain: SubscribedEventWithDomain[]
  }) {
    this.id = input.id
    this.handlerName = input.handlerName
    this.domain = input.domain
    this.subscribedEvents = input.subscribedEvents
    this.subscribedEventsWithDomain = input.subscribedEventsWithDomain
  }

  static parse(input: {
    readonly id: HandlerId
    readonly handlerName: HandlerName
    readonly domain: DomainName
    readonly subscribedEvents: EventName[]
    readonly subscribedEventsWithDomain: SubscribedEventWithDomain[]
  }): EventHandlerInfo {
    return new EventHandlerInfo(input)
  }
}
