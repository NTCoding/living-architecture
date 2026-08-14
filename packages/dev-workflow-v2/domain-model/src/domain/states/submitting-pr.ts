import { defineState } from '../define-state'
import { pass, fail } from '@nt-ai-lab/deterministic-agent-workflow-dsl'

/** @riviere-role domain-service */
export function defineSubmittingPrState() {
  return defineState({
    emoji: '🚀',
    agentInstructions: 'states/submitting_pr.md',
    canTransitionTo: ['AWAITING_CI', 'BLOCKED'],
    allowedWorkflowOperations: ['record-pr', 'create-pr'],
    forbidden: { write: true },

    allowForbidden: { bash: ['git push'] },

    transitionGuard: (ctx) => {
      if (!ctx.state.prNumber) return fail('prNumber not set. Run record-pr first.')
      return pass()
    },
  })
}
