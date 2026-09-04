import type { PreconditionResult } from '@nt-ai-lab/deterministic-agent-workflow-dsl'
import { z } from 'zod'
import type { WorkflowTransitionContext } from '../workflow-transition-context'

/** @riviere-role value-object */
export class ReviewingState {
  declare private readonly brand: 'ReviewingState'

  readonly name: 'REVIEWING'
  readonly emoji = '📋'
  readonly agentInstructions = 'states/reviewing.md'
  readonly canTransitionTo = ['SUBMITTING_PR', 'IMPLEMENTING', 'BLOCKED'] as const
  readonly forbidden = { write: true } as const
  readonly allowedWorkflowOperations = ['record-review'] as const

  private constructor(name: 'REVIEWING') {
    this.name = name
  }

  static parse(value: unknown): ReviewingState {
    z.literal('REVIEWING').parse(value)
    return new ReviewingState('REVIEWING')
  }

  transitionGuard(
    context: Parameters<typeof WorkflowTransitionContext.from>[0],
  ): PreconditionResult {
    const taskCheckRequired = context.state.githubIssue !== undefined
    const allPassed =
      context.state.architectureReviewPassed &&
      context.state.codeReviewPassed &&
      context.state.bugScannerPassed &&
      (!taskCheckRequired || context.state.taskCheckPassed)

    if (context.to === 'SUBMITTING_PR' && !allPassed) {
      return {
        pass: false,
        reason: taskCheckRequired
          ? 'Not all reviews passed. Each of architecture-review, code-review, bug-scanner, and task-check must pass.'
          : 'Not all reviews passed. Each of architecture-review, code-review, and bug-scanner must pass.',
      }
    }
    if (context.to === 'IMPLEMENTING' && allPassed) {
      return {
        pass: false,
        reason: 'All reviews passed. Transition to SUBMITTING_PR, not IMPLEMENTING.',
      }
    }
    return { pass: true }
  }
}
