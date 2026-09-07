import { z } from 'zod'
import type { WorkflowState } from '../workflow-types'

/** @riviere-role value-object */
export class AddressingFeedbackState {
  declare private readonly brand: 'AddressingFeedbackState'

  readonly name: 'ADDRESSING_FEEDBACK'
  readonly emoji = '🔧'
  readonly agentInstructions = 'states/addressing_feedback.md'
  readonly canTransitionTo = ['VERIFYING', 'BLOCKED'] as const
  readonly allowedWorkflowOperations = [] as const
  readonly forbidden = { write: true } as const
  readonly allowForbidden = { bash: ['git push'] } as const

  private constructor(name: 'ADDRESSING_FEEDBACK') {
    this.name = name
  }

  static parse(value: unknown): AddressingFeedbackState {
    z.literal('ADDRESSING_FEEDBACK').parse(value)
    return new AddressingFeedbackState('ADDRESSING_FEEDBACK')
  }

  onEntry(state: WorkflowState): WorkflowState {
    return state.with({
      feedbackAddressed: false,
      feedbackClean: false,
    })
  }
}
