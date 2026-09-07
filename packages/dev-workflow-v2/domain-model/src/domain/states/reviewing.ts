import type { PreconditionResult } from '@nt-ai-lab/deterministic-agent-workflow-dsl'
import { z } from 'zod'
import type { ReviewerDefinition } from '../reviewer-definitions'
import type { WorkflowTransitionContext } from '../workflow-transition-context'

export type ReviewingStateDeps = {
  readonly reviewers: readonly ReviewerDefinition[]
  readonly runCodeReview: (reviewers: readonly ReviewerDefinition[]) => void
}

const DEFAULT_REVIEWING_STATE_DEPS: ReviewingStateDeps = {
  reviewers: [],
  runCodeReview: () => undefined,
}

/** @riviere-role value-object */
export class ReviewingState {
  declare private readonly brand: 'ReviewingState'

  readonly name: 'REVIEWING'
  readonly emoji = '📋'
  readonly agentInstructions = 'states/reviewing.md'
  readonly canTransitionTo = [
    'SUBMITTING_PR',
    'IMPLEMENTING',
    'ADDRESSING_FEEDBACK',
    'REFLECTING',
    'BLOCKED',
  ] as const
  readonly forbidden = { write: true } as const
  readonly allowedWorkflowOperations = [
    'record-review',
    'verify-pr-review-gate',
    'sync-reviewer-satisfaction',
  ] as const
  readonly afterEntry: () => void

  private constructor(name: 'REVIEWING', deps: ReviewingStateDeps) {
    this.name = name
    this.afterEntry = () => deps.runCodeReview(deps.reviewers)
  }

  static parse(value: unknown, deps: ReviewingStateDeps = DEFAULT_REVIEWING_STATE_DEPS): ReviewingState {
    z.literal('REVIEWING').parse(value)
    return new ReviewingState('REVIEWING', deps)
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
