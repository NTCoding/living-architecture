import type { PreconditionResult } from '@nt-ai-lab/deterministic-agent-workflow-dsl'
import { z } from 'zod'
import type { WorkflowTransitionContext } from '../workflow-transition-context'

export type AwaitingPrFeedbackStateDeps = {
  readonly awaitPrFeedback: () => void
}

const DEFAULT_AWAITING_PR_FEEDBACK_STATE_DEPS: AwaitingPrFeedbackStateDeps = {
  awaitPrFeedback: () => undefined,
}

/** @riviere-role value-object */
export class AwaitingPrFeedbackState {
  declare private readonly brand: 'AwaitingPrFeedbackState'

  readonly name: 'AWAITING_PR_FEEDBACK'
  readonly emoji = '💬'
  readonly agentInstructions = 'states/awaiting_pr_feedback.md'
  readonly canTransitionTo = ['ADDRESSING_FEEDBACK', 'REFLECTING'] as const
  readonly allowedWorkflowOperations = [] as const
  readonly forbidden = { write: true } as const
  readonly afterEntry: () => void

  private constructor(name: 'AWAITING_PR_FEEDBACK', deps: AwaitingPrFeedbackStateDeps) {
    this.name = name
    this.afterEntry = () => deps.awaitPrFeedback()
  }

  static parse(
    value: unknown,
    deps: AwaitingPrFeedbackStateDeps = DEFAULT_AWAITING_PR_FEEDBACK_STATE_DEPS,
  ): AwaitingPrFeedbackState {
    z.literal('AWAITING_PR_FEEDBACK').parse(value)
    return new AwaitingPrFeedbackState('AWAITING_PR_FEEDBACK', deps)
  }

  transitionGuard(
    context: Parameters<typeof WorkflowTransitionContext.from>[0],
  ): PreconditionResult {
    if (context.state.prNumber === undefined) {
      return {
        pass: false,
        reason: 'prNumber not set. Record the PR before awaiting PR feedback.',
      }
    }
    return { pass: true }
  }
}