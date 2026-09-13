import { z } from 'zod'

/** @riviere-role value-object */
export class HumanReviewingState {
  declare private readonly brand: 'HumanReviewingState'

  readonly name: 'HUMAN_REVIEWING'
  readonly emoji = '👤'
  readonly agentInstructions = 'states/human_reviewing.md'
  readonly allowIdle = true
  readonly canTransitionTo = ['ADDRESSING_FEEDBACK', 'BLOCKED'] as const
  readonly allowedWorkflowOperations = [] as const
  readonly forbidden = { write: true } as const

  private constructor(name: 'HUMAN_REVIEWING') {
    this.name = name
  }

  static parse(value: unknown): HumanReviewingState {
    z.literal('HUMAN_REVIEWING').parse(value)
    return new HumanReviewingState('HUMAN_REVIEWING')
  }
}
