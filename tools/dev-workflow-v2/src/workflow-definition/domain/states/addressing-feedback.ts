import type {
  ConcreteStateDefinition, WorkflowState 
} from '../workflow-types'
import {
  pass, fail 
} from '@ntcoding/agentic-workflow-builder/dsl'

export const addressingFeedbackState: ConcreteStateDefinition = {
  emoji: '🔧',
  agentInstructions: 'states/addressing-feedback.md',
  canTransitionTo: ['REVIEWING', 'BLOCKED'],
  allowedWorkflowOperations: ['record-feedback-addressed'],
  forbidden: { write: true },

  transitionGuard: (ctx) => {
    if (!ctx.state.feedbackAddressed)
      return fail('Feedback not addressed. Run record-feedback-addressed first.')
    /* v8 ignore next 2 -- ?? 0 fallbacks are defensive; counts are always set when feedbackAddressed is true */
    const unresolved = ctx.state.feedbackUnresolvedCount ?? 0
    const addressed = ctx.state.feedbackAddressedCount ?? 0
    if (addressed < unresolved)
      return fail(
        `Only ${addressed} of ${unresolved} feedback threads addressed. Address all threads before transitioning.`,
      )
    return pass()
  },

  onEntry: (state: WorkflowState): WorkflowState => ({
    ...state,
    feedbackAddressed: false,
    feedbackClean: false,
    feedbackAddressedCount: undefined,
  }),
}
