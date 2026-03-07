import type { ConcreteStateDefinition } from '../workflow-types'
import {
  pass, fail 
} from '@ntcoding/agentic-workflow-builder/dsl'

export const reflectingState: ConcreteStateDefinition = {
  emoji: '🪞',
  agentInstructions: 'states/reflecting.md',
  canTransitionTo: ['COMPLETE', 'BLOCKED'],
  allowedWorkflowOperations: ['record-reflection'],
  forbidden: { write: true },

  transitionGuard: (ctx) => {
    if (!ctx.state.reflectionPath)
      return fail('Reflection not written. Run record-reflection first.')
    return pass()
  },
}
