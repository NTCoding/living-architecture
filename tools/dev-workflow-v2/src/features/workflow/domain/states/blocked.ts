import type { ConcreteStateDefinition } from '../workflow-types'
import {
  pass, fail 
} from '@ntcoding/agentic-workflow-builder/dsl'

export const blockedState: ConcreteStateDefinition = {
  emoji: '⚠️',
  agentInstructions: 'states/blocked.md',
  forbidden: { write: true },
  canTransitionTo: [
    'IMPLEMENTING',
    'REVIEWING',
    'SUBMITTING_PR',
    'AWAITING_CI',
    'CHECKING_FEEDBACK',
    'ADDRESSING_FEEDBACK',
    'REFLECTING',
  ],
  allowedWorkflowOperations: [],

  transitionGuard: (ctx) => {
    const preBlockedState = ctx.state.preBlockedState
    if (ctx.to !== preBlockedState) {
      /* v8 ignore next 4 */
      return fail(
        `Cannot transition from BLOCKED to ${ctx.to}. Must return to pre-blocked state: ${preBlockedState ?? 'unknown'}.`,
      )
    }
    return pass()
  },
}
