import type {
  PreconditionResult,
  TransitionContext,
} from '@nt-ai-lab/deterministic-agent-workflow-dsl'
import { z } from 'zod'
import type { WorkflowState } from '../workflow-types'

type StateName = WorkflowState['currentStateMachineState']

/** @riviere-role value-object */
export class AddressingFeedbackState {
  declare private readonly brand: 'AddressingFeedbackState'

  readonly name: 'ADDRESSING_FEEDBACK'
  readonly emoji = '🔧'
  readonly agentInstructions = 'states/addressing_feedback.md'
  readonly canTransitionTo = ['REFLECTING', 'BLOCKED'] as const
  readonly allowedWorkflowOperations = ['verify-feedback-addressed'] as const
  readonly forbidden = { write: true } as const
  readonly allowForbidden = { bash: ['git push'] } as const

  private constructor(name: 'ADDRESSING_FEEDBACK') {
    this.name = name
  }

  static parse(value: unknown): AddressingFeedbackState {
    z.literal('ADDRESSING_FEEDBACK').parse(value)
    return new AddressingFeedbackState('ADDRESSING_FEEDBACK')
  }

  transitionGuard(context: TransitionContext<WorkflowState, StateName>): PreconditionResult {
    if (context.to === 'BLOCKED') return { pass: true }
    if (!context.state.feedbackAddressed) {
      return {
        pass: false,
        reason: 'Feedback not addressed. Run verify-feedback-addressed first.',
      }
    }
    if (!context.state.feedbackClean) {
      return {
        pass: false,
        reason:
          'PR feedback is not yet clear. Resolve all feedback, ensure no CHANGES_REQUESTED review remains, then run verify-feedback-addressed again.',
      }
    }
    return { pass: true }
  }

  onEntry(state: WorkflowState): WorkflowState {
    return state.with({
      feedbackAddressed: false,
      feedbackClean: false,
    })
  }
}
