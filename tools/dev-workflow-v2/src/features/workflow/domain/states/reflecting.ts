import type { ConcreteStateDefinition } from '../workflow-types'

export const reflectingState: ConcreteStateDefinition = {
  emoji: '🪞',
  agentInstructions: 'states/reflecting.md',
  canTransitionTo: ['COMPLETE', 'BLOCKED'],
  allowedWorkflowOperations: [],
  forbidden: { write: true },
}
