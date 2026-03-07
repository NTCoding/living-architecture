import type { ConcreteStateDefinition } from '../workflow-types'
import {
  pass, fail 
} from '@ntcoding/agentic-workflow-builder/dsl'

export const submittingPrState: ConcreteStateDefinition = {
  emoji: '🚀',
  agentInstructions: 'states/submitting-pr.md',
  canTransitionTo: ['AWAITING_CI', 'BLOCKED'],
  allowedWorkflowOperations: ['record-pr'],
  forbidden: { write: true },

  allowForbidden: { bash: ['git push', 'gh pr'] },

  transitionGuard: (ctx) => {
    if (!ctx.state.prNumber) return fail('prNumber not set. Run record-pr first.')
    return pass()
  },
}
