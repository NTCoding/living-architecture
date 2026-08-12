import { defineState } from '../define-state'

export const reflectingState = defineState({
  emoji: '🪞',
  agentInstructions: 'states/reflecting.md',
  canTransitionTo: ['COMPLETE', 'BLOCKED'],
  allowedWorkflowOperations: [],
  forbidden: { write: true },
})
