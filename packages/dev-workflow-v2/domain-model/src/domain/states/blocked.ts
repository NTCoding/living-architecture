import type {
  PreconditionResult,
  TransitionContext,
} from '@nt-ai-lab/deterministic-agent-workflow-dsl'
import { z } from 'zod'
import type { WorkflowState } from '../workflow-types'

type StateName = WorkflowState['currentStateMachineState']

/** @riviere-role value-object */
export class BlockedState {
  declare private readonly brand: 'BlockedState'

  readonly name: 'BLOCKED'
  readonly emoji = '⚠️'
  readonly agentInstructions = 'states/blocked.md'
  readonly allowIdle = true
  readonly forbidden = { write: true } as const
  readonly canTransitionTo = [
    'IMPLEMENTING',
    'REVIEWING',
    'SUBMITTING_PR',
    'AWAITING_CI',
    'AWAITING_PR_FEEDBACK',
    'ADDRESSING_FEEDBACK',
    'REFLECTING',
  ] as const
  readonly allowedWorkflowOperations = [] as const

  private constructor(name: 'BLOCKED') {
    this.name = name
  }

  static parse(value: unknown): BlockedState {
    z.literal('BLOCKED').parse(value)
    return new BlockedState('BLOCKED')
  }

  transitionGuard(context: TransitionContext<WorkflowState, StateName>): PreconditionResult {
    const preBlockedState = context.state.preBlockedState
    if (context.to !== preBlockedState) {
      return {
        pass: false,
        reason: `Cannot transition from BLOCKED to ${context.to}. Must return to pre-blocked state: ${preBlockedState ?? 'unknown'}.`,
      }
    }
    return { pass: true }
  }
}
