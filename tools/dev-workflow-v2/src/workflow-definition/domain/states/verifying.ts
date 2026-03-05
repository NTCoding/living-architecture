import type { ConcreteStateDefinition } from '../workflow-types'
import {
  pass, fail 
} from '@ntcoding/agentic-workflow-builder/dsl'

export const verifyingState: ConcreteStateDefinition = {
  emoji: '🔍',
  agentInstructions: 'states/verifying.md',
  canTransitionTo: ['REVIEWING', 'IMPLEMENTING', 'BLOCKED'],
  allowedWorkflowOperations: ['record-verify-passed', 'record-verify-failed'],

  transitionGuard: (ctx) => {
    if (ctx.to === 'REVIEWING' && !ctx.state.verifyPassed)
      return fail('Verify not passed. Run record-verify-passed first.')
    if (ctx.to === 'IMPLEMENTING' && ctx.state.verifyPassed)
      return fail('Verify passed. Transition to REVIEWING, not IMPLEMENTING.')
    return pass()
  },
}
