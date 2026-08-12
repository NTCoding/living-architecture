import type { EventName } from './event-name'

/**
 * A subscribed event where the source domain is unknown.
 * @riviere-role value-object
 */
export class UnknownSourceEvent {
  declare private readonly brand: 'UnknownSourceEvent'
  readonly eventName: EventName
  readonly sourceKnown: false

  private constructor(input: {
    readonly eventName: EventName;
    readonly sourceKnown: false 
  }) {
    this.eventName = input.eventName
    this.sourceKnown = input.sourceKnown
  }

  static parse(input: {
    readonly eventName: EventName
    readonly sourceKnown: false
  }): UnknownSourceEvent {
    return new UnknownSourceEvent(input)
  }
}
