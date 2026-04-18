import type { ConcreteStateDefinition } from '../workflow-types'
import {
  pass, fail 
} from '@nt-ai-lab/deterministic-agent-workflow-dsl'

export const submittingPrState: ConcreteStateDefinition = {
  emoji: '🚀',
  agentInstructions: 'states/submitting_pr.md',
  canTransitionTo: ['AWAITING_CI', 'BLOCKED'],
  allowedWorkflowOperations: ['record-pr'],
  forbidden: { write: true },

  allowForbidden: { bash: ['git push', 'gh pr'] },

  transitionGuard: (ctx) => {
    if (!ctx.state.prNumber) return fail('prNumber not set. Run record-pr first.')
    return pass()
  },
}
