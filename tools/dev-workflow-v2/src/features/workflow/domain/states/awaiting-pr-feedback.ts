import type { ConcreteStateDefinition } from '../workflow-types'

export const awaitingPrFeedbackState: ConcreteStateDefinition = {
  emoji: '💬',
  agentInstructions: 'states/awaiting_pr_feedback.md',
  canTransitionTo: ['ADDRESSING_FEEDBACK', 'REFLECTING'],
  allowedWorkflowOperations: [],
  forbidden: { write: true },
}
