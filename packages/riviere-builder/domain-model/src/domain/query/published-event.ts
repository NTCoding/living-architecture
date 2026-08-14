import type { DomainName } from './domain-name'
import type { EventId } from './event-id'
import type { EventName } from './event-name'
import { EventSubscriber } from './event-subscriber'

/**
 * A published event with its subscribers.
 * @riviere-role value-object
 */
export class PublishedEvent {
  declare private readonly brand: 'PublishedEvent'
  readonly id: EventId
  readonly eventName: EventName
  readonly domain: DomainName
  readonly handlers: EventSubscriber[]

  private constructor(input: {
    readonly id: EventId
    readonly eventName: EventName
    readonly domain: DomainName
    readonly handlers: EventSubscriber[]
  }) {
    this.id = input.id
    this.eventName = input.eventName
    this.domain = input.domain
    this.handlers = input.handlers
  }

  static parse(input: {
    readonly id: EventId
    readonly eventName: EventName
    readonly domain: DomainName
    readonly handlers: EventSubscriber[]
  }): PublishedEvent {
    return new PublishedEvent(input)
  }
}
