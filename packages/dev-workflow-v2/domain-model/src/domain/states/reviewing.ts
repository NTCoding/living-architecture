import type { PreconditionResult } from '@nt-ai-lab/deterministic-agent-workflow-dsl'
import { z } from 'zod'
import type { ReviewerDefinition } from '../reviewer-definitions'
import type { WorkflowTransitionContext } from '../workflow-transition-context'

type ReviewingStateDeps = {
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
  readonly canTransitionTo = ['ADDRESSING_FEEDBACK', 'REFLECTING', 'BLOCKED'] as const
  readonly forbidden = { write: true } as const
  readonly allowedWorkflowOperations = [
    'verify-pr-review-gate',
    'sync-reviewer-satisfaction',
  ] as const

  private readonly deps: ReviewingStateDeps

  private constructor(name: 'REVIEWING', deps: ReviewingStateDeps) {
    this.name = name
    this.deps = deps
  }

  static parse(
    value: unknown,
    deps: ReviewingStateDeps = DEFAULT_REVIEWING_STATE_DEPS,
  ): ReviewingState {
    z.literal('REVIEWING').parse(value)
    return new ReviewingState('REVIEWING', deps)
  }

  afterEntry(): void {
    this.deps.runCodeReview(this.deps.reviewers)
  }

  transitionGuard(
    context: Parameters<typeof WorkflowTransitionContext.from>[0],
  ): PreconditionResult {
    return {
      pass: false,
      reason: `The review gate owns transitions out of REVIEWING. Run verify-pr-review-gate instead of transitioning manually to ${context.to}.`,
    }
  }
}
