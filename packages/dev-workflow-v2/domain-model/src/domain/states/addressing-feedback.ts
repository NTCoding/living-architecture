import type { WorkflowState } from '../workflow-types'
import { defineState } from '../define-state'
import { pass, fail } from '@nt-ai-lab/deterministic-agent-workflow-dsl'

/** @riviere-role domain-service */
export function defineAddressingFeedbackState() {
  return defineState({
    emoji: '🔧',
    agentInstructions: 'states/addressing_feedback.md',
    canTransitionTo: ['REVIEWING', 'BLOCKED'],
    allowedWorkflowOperations: ['verify-feedback-addressed'],
    forbidden: { write: true },

    transitionGuard: (ctx) => {
      if (ctx.to === 'BLOCKED') return pass()
      if (!ctx.state.feedbackAddressed)
        return fail('Feedback not addressed. Run verify-feedback-addressed first.')
      if (!ctx.state.feedbackClean)
        return fail(
          'PR feedback is not yet clear. Resolve all feedback, ensure no CHANGES_REQUESTED review remains, then run verify-feedback-addressed again.',
        )
      return pass()
    },

    onEntry: (state: WorkflowState): WorkflowState =>
      state.with({
        feedbackAddressed: false,
        feedbackClean: false,
      }),
  })
}
