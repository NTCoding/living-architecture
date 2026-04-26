import type { ConcreteStateDefinition } from '../workflow-types'

export const completeState: ConcreteStateDefinition = {
  emoji: '✅',
  agentInstructions: 'states/complete.md',
  allowIdle: true,
  canTransitionTo: [],
  allowedWorkflowOperations: [],
  forbidden: { write: true },
}
