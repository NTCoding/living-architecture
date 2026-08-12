import { defineState } from '../define-state'

export const awaitingPrFeedbackState = defineState({
  emoji: '💬',
  agentInstructions: 'states/awaiting_pr_feedback.md',
  canTransitionTo: ['ADDRESSING_FEEDBACK', 'REFLECTING'],
  allowedWorkflowOperations: [],
  forbidden: { write: true },
})
