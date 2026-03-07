import type { ConcreteStateDefinition } from '../workflow-types'
import {
  pass, fail 
} from '@ntcoding/agentic-workflow-builder/dsl'

export const awaitingCiState: ConcreteStateDefinition = {
  emoji: '⏳',
  agentInstructions: 'states/awaiting-ci.md',
  canTransitionTo: ['CHECKING_FEEDBACK', 'IMPLEMENTING', 'BLOCKED'],
  allowedWorkflowOperations: ['record-ci-passed', 'record-ci-failed'],
  forbidden: { write: true },
  allowForbidden: { bash: ['gh pr checks'] },

  transitionGuard: (ctx) => {
    if (ctx.to === 'CHECKING_FEEDBACK' && !ctx.state.ciPassed)
      return fail('CI not passed. Run record-ci-passed first.')
    if (ctx.to === 'IMPLEMENTING' && ctx.state.ciPassed)
      return fail('CI passed. Transition to CHECKING_FEEDBACK, not IMPLEMENTING.')
    return pass()
  },
}
