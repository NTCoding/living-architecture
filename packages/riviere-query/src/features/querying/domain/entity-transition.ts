import type { OperationName } from './operation-name'
import type { State } from './state'

/**
 * A state transition in an entity's state machine.
 * @riviere-role value-object
 */
export class EntityTransition {
  declare private readonly brand: 'EntityTransition'
  readonly from: State
  readonly to: State
  readonly triggeredBy: OperationName

  private constructor(input: {
    readonly from: State
    readonly to: State
    readonly triggeredBy: OperationName
  }) {
    this.from = input.from
    this.to = input.to
    this.triggeredBy = input.triggeredBy
  }

  static parse(input: {
    readonly from: State
    readonly to: State
    readonly triggeredBy: OperationName
  }): EntityTransition {
    return new EntityTransition(input)
  }
}
