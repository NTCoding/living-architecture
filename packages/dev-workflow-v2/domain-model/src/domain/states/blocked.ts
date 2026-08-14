import { defineState } from '../define-state'
import { pass, fail } from '@nt-ai-lab/deterministic-agent-workflow-dsl'

/** @riviere-role domain-service */
export function defineBlockedState() {
  return defineState({
    emoji: '⚠️',
    agentInstructions: 'states/blocked.md',
    allowIdle: true,
    forbidden: { write: true },
    canTransitionTo: [
      'IMPLEMENTING',
      'REVIEWING',
      'SUBMITTING_PR',
      'AWAITING_CI',
      'AWAITING_PR_FEEDBACK',
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
  })
}
