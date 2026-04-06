import type { ConcreteStateDefinition } from '../workflow-types'

export const completeState: ConcreteStateDefinition = {
  emoji: '✅',
  agentInstructions: 'states/complete.md',
  canTransitionTo: [],
  allowedWorkflowOperations: [],
  forbidden: { write: true },
}
