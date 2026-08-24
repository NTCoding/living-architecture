import { z } from 'zod'

/** @riviere-role value-object */
export class AwaitingPrFeedbackState {
  declare private readonly brand: 'AwaitingPrFeedbackState'

  readonly name: 'AWAITING_PR_FEEDBACK'
  readonly emoji = '💬'
  readonly agentInstructions = 'states/awaiting_pr_feedback.md'
  readonly canTransitionTo = ['ADDRESSING_FEEDBACK', 'REFLECTING'] as const
  readonly allowedWorkflowOperations = [] as const
  readonly forbidden = { write: true } as const

  private constructor(name: 'AWAITING_PR_FEEDBACK') {
    this.name = name
  }

  static parse(value: unknown): AwaitingPrFeedbackState {
    z.literal('AWAITING_PR_FEEDBACK').parse(value)
    return new AwaitingPrFeedbackState('AWAITING_PR_FEEDBACK')
  }
}
