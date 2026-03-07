import type { ConcreteStateDefinition } from '../workflow-types'
import {
  pass, fail 
} from '@ntcoding/agentic-workflow-builder/dsl'

export const checkingFeedbackState: ConcreteStateDefinition = {
  emoji: '💬',
  agentInstructions: 'states/checking-feedback.md',
  canTransitionTo: ['REFLECTING', 'ADDRESSING_FEEDBACK', 'BLOCKED'],
  allowedWorkflowOperations: ['record-feedback-clean', 'record-feedback-exists'],
  forbidden: { write: true },
  allowForbidden: { bash: ['gh pr view'] },

  transitionGuard: (ctx) => {
    if (ctx.to === 'REFLECTING' && !ctx.state.feedbackClean)
      return fail('Feedback not clean. Run record-feedback-clean first.')
    if (ctx.to === 'ADDRESSING_FEEDBACK' && ctx.state.feedbackClean)
      return fail('Feedback is clean. Transition to REFLECTING, not ADDRESSING_FEEDBACK.')
    return pass()
  },
}
