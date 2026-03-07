import type { ConcreteStateDefinition } from '../workflow-types'
import {
  pass, fail 
} from '@ntcoding/agentic-workflow-builder/dsl'

export const reviewingState: ConcreteStateDefinition = {
  emoji: '📋',
  agentInstructions: 'states/reviewing.md',
  canTransitionTo: ['SUBMITTING_PR', 'IMPLEMENTING', 'BLOCKED'],
  forbidden: { write: true },
  allowedWorkflowOperations: [
    'record-architecture-review-passed',
    'record-architecture-review-failed',
    'record-code-review-passed',
    'record-code-review-failed',
    'record-bug-scanner-passed',
    'record-bug-scanner-failed',
    'record-task-check-passed',
  ],

  transitionGuard: (ctx) => {
    const allPassed =
      ctx.state.architectureReviewPassed && ctx.state.codeReviewPassed && ctx.state.bugScannerPassed
    if (ctx.to === 'SUBMITTING_PR' && !allPassed)
      return fail(
        'Not all reviews passed. Each of architecture-review, code-review, and bug-scanner must pass.',
      )
    if (ctx.to === 'IMPLEMENTING' && allPassed)
      return fail('All reviews passed. Transition to SUBMITTING_PR, not IMPLEMENTING.')
    return pass()
  },
}
