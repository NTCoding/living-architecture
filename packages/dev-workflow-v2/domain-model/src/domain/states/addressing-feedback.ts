import type { PreconditionResult } from '@nt-ai-lab/deterministic-agent-workflow-dsl'
import { z } from 'zod'
import type { WorkflowState } from '../workflow-types'
import type { WorkflowTransitionContext } from '../workflow-transition-context'

/** @riviere-role value-object */
export class AddressingFeedbackState {
  declare private readonly brand: 'AddressingFeedbackState'

  readonly name: 'ADDRESSING_FEEDBACK'
  readonly emoji = '🔧'
  readonly agentInstructions = 'states/addressing_feedback.md'
  readonly canTransitionTo = ['REVIEWING', 'BLOCKED'] as const
  readonly allowedWorkflowOperations = [] as const
  readonly forbidden = { write: true } as const
  readonly allowForbidden = { bash: ['git push'] } as const

  private constructor(name: 'ADDRESSING_FEEDBACK') {
    this.name = name
  }

  static parse(value: unknown): AddressingFeedbackState {
    z.literal('ADDRESSING_FEEDBACK').parse(value)
    return new AddressingFeedbackState('ADDRESSING_FEEDBACK')
  }

  transitionGuard(
    context: Parameters<typeof WorkflowTransitionContext.from>[0],
  ): PreconditionResult {
    if (context.to === 'BLOCKED') return { pass: true }
    return { pass: true }
  }

  onEntry(state: WorkflowState): WorkflowState {
    return state.with({})
  }
}
