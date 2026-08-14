import { defineState } from '../define-state'

/** @riviere-role domain-service */
export function defineAwaitingPrFeedbackState() {
  return defineState({
    emoji: '💬',
    agentInstructions: 'states/awaiting_pr_feedback.md',
    canTransitionTo: ['ADDRESSING_FEEDBACK', 'REFLECTING'],
    allowedWorkflowOperations: [],
    forbidden: { write: true },
  })
}
