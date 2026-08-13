import { defineState } from '../define-state'
import { pass, fail } from '@nt-ai-lab/deterministic-agent-workflow-dsl'

/** @riviere-role domain-service */
export function defineReviewingState() {
  return defineState({
    emoji: '📋',
    agentInstructions: 'states/reviewing.md',
    canTransitionTo: ['SUBMITTING_PR', 'IMPLEMENTING', 'BLOCKED'],
    forbidden: { write: true },
    allowedWorkflowOperations: ['record-review'],

    transitionGuard: (ctx) => {
      const taskCheckRequired = ctx.state.githubIssue !== undefined
      const allPassed =
        ctx.state.architectureReviewPassed &&
        ctx.state.codeReviewPassed &&
        ctx.state.bugScannerPassed &&
        (!taskCheckRequired || ctx.state.taskCheckPassed)

      if (ctx.to === 'SUBMITTING_PR' && !allPassed)
        return fail(
          taskCheckRequired
            ? 'Not all reviews passed. Each of architecture-review, code-review, bug-scanner, and task-check must pass.'
            : 'Not all reviews passed. Each of architecture-review, code-review, and bug-scanner must pass.',
        )
      if (ctx.to === 'IMPLEMENTING' && allPassed)
        return fail('All reviews passed. Transition to SUBMITTING_PR, not IMPLEMENTING.')
      return pass()
    },
  })
}
