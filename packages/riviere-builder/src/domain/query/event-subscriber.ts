import type { DomainName } from './domain-name'
import type { HandlerId } from './handler-id'
import type { HandlerName } from './handler-name'

/**
 * An event handler that subscribes to an event.
 * @riviere-role value-object
 */
export class EventSubscriber {
  declare private readonly brand: 'EventSubscriber'
  readonly handlerId: HandlerId
  readonly handlerName: HandlerName
  readonly domain: DomainName

  private constructor(input: {
    readonly handlerId: HandlerId
    readonly handlerName: HandlerName
    readonly domain: DomainName
  }) {
    this.handlerId = input.handlerId
    this.handlerName = input.handlerName
    this.domain = input.domain
  }

  static parse(input: {
    readonly handlerId: HandlerId
    readonly handlerName: HandlerName
    readonly domain: DomainName
  }): EventSubscriber {
    return new EventSubscriber(input)
  }
}
