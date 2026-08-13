import { defineState } from '../define-state'

/** @riviere-role domain-service */
export function defineCompleteState() {
  return defineState({
    emoji: '✅',
    agentInstructions: 'states/complete.md',
    allowIdle: true,
    canTransitionTo: [],
    allowedWorkflowOperations: [],
    forbidden: { write: true },
  })
}
