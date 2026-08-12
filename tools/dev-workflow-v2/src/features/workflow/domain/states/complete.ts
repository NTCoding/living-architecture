import { defineState } from '../define-state'

export const completeState = defineState({
  emoji: '✅',
  agentInstructions: 'states/complete.md',
  allowIdle: true,
  canTransitionTo: [],
  allowedWorkflowOperations: [],
  forbidden: { write: true },
})
