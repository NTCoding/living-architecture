import type { ConcreteStateDefinition } from '../workflow-types'
import {
  pass, fail 
} from '@ntcoding/agentic-workflow-builder/dsl'

export const reviewingState: ConcreteStateDefinition = {
  emoji: '📋',
  agentInstructions: 'states/reviewing.md',
  canTransitionTo: ['SUBMITTING_PR', 'IMPLEMENTING', 'BLOCKED'],
  allowedWorkflowOperations: ['record-review-passed', 'record-review-failed'],

  transitionGuard: (ctx) => {
    if (ctx.to === 'SUBMITTING_PR' && !ctx.state.reviewPassed)
      return fail('Review not passed. Run record-review-passed first.')
    if (ctx.to === 'IMPLEMENTING' && ctx.state.reviewPassed)
      return fail('Review passed. Transition to SUBMITTING_PR, not IMPLEMENTING.')
    return pass()
  },
}
