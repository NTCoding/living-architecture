import type {
  ConcreteStateDefinition, WorkflowState 
} from '../workflow-types'
import {
  pass, fail 
} from '@ntcoding/agentic-workflow-builder/dsl'

export const addressingFeedbackState: ConcreteStateDefinition = {
  emoji: '🔧',
  agentInstructions: 'states/addressing-feedback.md',
  canTransitionTo: ['VERIFYING', 'BLOCKED'],
  allowedWorkflowOperations: ['record-feedback-addressed'],

  transitionGuard: (ctx) => {
    if (!ctx.state.feedbackAddressed)
      return fail('Feedback not addressed. Run record-feedback-addressed first.')
    return pass()
  },

  onEntry: (state: WorkflowState): WorkflowState => ({
    ...state,
    feedbackAddressed: false,
    feedbackClean: false,
  }),
}
