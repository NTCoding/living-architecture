import type { ConcreteStateDefinition } from '../workflow-types'

export const awaitingPrFeedbackState: ConcreteStateDefinition = {
  emoji: '💬',
  agentInstructions: 'states/awaiting_pr_feedback.md',
  canTransitionTo: ['BLOCKED'],
  allowedWorkflowOperations: [],
  forbidden: { write: true },
}
