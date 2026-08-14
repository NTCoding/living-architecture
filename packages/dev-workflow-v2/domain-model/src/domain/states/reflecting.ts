import { defineState } from '../define-state'

/** @riviere-role domain-service */
export function defineReflectingState() {
  return defineState({
    emoji: '🪞',
    agentInstructions: 'states/reflecting.md',
    canTransitionTo: ['COMPLETE', 'BLOCKED'],
    allowedWorkflowOperations: [],
    forbidden: { write: true },
  })
}
