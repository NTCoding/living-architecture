import { defineState } from '../define-state'
import { pass, fail } from '@nt-ai-lab/deterministic-agent-workflow-dsl'

/** @riviere-role domain-service */
export function defineAwaitingCiState() {
  return defineState({
    emoji: '⏳',
    agentInstructions: 'states/awaiting_ci.md',
    canTransitionTo: ['AWAITING_PR_FEEDBACK', 'IMPLEMENTING', 'BLOCKED'],
    allowedWorkflowOperations: ['record-ci-passed', 'record-ci-failed'],
    forbidden: { write: true },
    allowForbidden: { bash: ['gh pr checks'] },

    transitionGuard: (ctx) => {
      if (ctx.to === 'AWAITING_PR_FEEDBACK' && !ctx.state.ciPassed)
        return fail('CI not passed. Run record-ci-passed first.')
      if (ctx.to === 'IMPLEMENTING' && ctx.state.ciPassed)
        return fail('CI passed. Transition to AWAITING_PR_FEEDBACK, not IMPLEMENTING.')
      return pass()
    },
  })
}
