import type { PreconditionResult } from '@nt-ai-lab/deterministic-agent-workflow-dsl'
import { z } from 'zod'
import type { WorkflowTransitionContext } from '../workflow-transition-context'
/** @riviere-role value-object */
export class SubmittingPrState {
  declare private readonly brand: 'SubmittingPrState'

  readonly name: 'SUBMITTING_PR'
  readonly emoji = '🚀'
  readonly agentInstructions = 'states/submitting_pr.md'
  readonly canTransitionTo = ['REVIEWING', 'BLOCKED'] as const
  readonly allowedWorkflowOperations = ['create-pr'] as const
  readonly forbidden = { write: true } as const

  private constructor(name: 'SUBMITTING_PR') {
    this.name = name
  }

  static parse(value: unknown): SubmittingPrState {
    z.literal('SUBMITTING_PR').parse(value)
    return new SubmittingPrState('SUBMITTING_PR')
  }

  transitionGuard(
    context: Parameters<typeof WorkflowTransitionContext.from>[0],
  ): PreconditionResult {
    if (context.to === 'REVIEWING' && context.state.prNumber === undefined) {
      return {
        pass: false,
        reason: 'Pull request creation did not record a pull request.',
      }
    }
    return { pass: true }
  }
}
