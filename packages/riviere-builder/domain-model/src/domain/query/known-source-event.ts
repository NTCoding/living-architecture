import type { DomainName } from './domain-name'
import type { EventName } from './event-name'

/**
 * A subscribed event where the source domain is known.
 * @riviere-role value-object
 */
export class KnownSourceEvent {
  declare private readonly brand: 'KnownSourceEvent'
  readonly eventName: EventName
  readonly sourceDomain: DomainName
  readonly sourceKnown: true

  private constructor(input: {
    readonly eventName: EventName
    readonly sourceDomain: DomainName
    readonly sourceKnown: true
  }) {
    this.eventName = input.eventName
    this.sourceDomain = input.sourceDomain
    this.sourceKnown = input.sourceKnown
  }

  static parse(input: {
    readonly eventName: EventName
    readonly sourceDomain: DomainName
    readonly sourceKnown: true
  }): KnownSourceEvent {
    return new KnownSourceEvent(input)
  }
}
