import type { PreconditionResult } from '@nt-ai-lab/deterministic-agent-workflow-dsl'
import { z } from 'zod'
import type { WorkflowTransitionContext } from '../workflow-transition-context'

/** @riviere-role value-object */
export class AwaitingCiState {
  declare private readonly brand: 'AwaitingCiState'

  readonly name: 'AWAITING_CI'
  readonly emoji = '⏳'
  readonly agentInstructions = 'states/awaiting_ci.md'
  readonly canTransitionTo = ['AWAITING_PR_FEEDBACK', 'IMPLEMENTING', 'BLOCKED'] as const
  readonly allowedWorkflowOperations = ['record-ci-passed', 'record-ci-failed'] as const
  readonly forbidden = { write: true } as const
  readonly allowForbidden = { bash: ['gh pr checks'] } as const

  private constructor(name: 'AWAITING_CI') {
    this.name = name
  }

  static parse(value: unknown): AwaitingCiState {
    z.literal('AWAITING_CI').parse(value)
    return new AwaitingCiState('AWAITING_CI')
  }

  transitionGuard(
    context: Parameters<typeof WorkflowTransitionContext.from>[0],
  ): PreconditionResult {
    if (context.to === 'AWAITING_PR_FEEDBACK' && !context.state.ciPassed) {
      return {
        pass: false,
        reason: 'CI not passed. Run record-ci-passed first.',
      }
    }
    if (context.to === 'IMPLEMENTING' && context.state.ciPassed) {
      return {
        pass: false,
        reason: 'CI passed. Transition to AWAITING_PR_FEEDBACK, not IMPLEMENTING.',
      }
    }
    return { pass: true }
  }
}
