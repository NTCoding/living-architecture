import { z } from 'zod'
import type { PreconditionResult } from '@nt-ai-lab/deterministic-agent-workflow-dsl'
import type { WorkflowState } from '../workflow-types'
import type { WorkflowTransitionContext } from '../workflow-transition-context'

/** @riviere-role value-object */
export class VerifyingState {
  declare private readonly brand: 'VerifyingState'

  readonly name: 'VERIFYING'
  readonly emoji = '🧪'
  readonly agentInstructions = 'states/verifying.md'
  readonly canTransitionTo = ['SUBMITTING_PR', 'BLOCKED'] as const
  readonly allowedWorkflowOperations = ['verify-local'] as const
  readonly forbidden = { write: true } as const

  private constructor(name: 'VERIFYING') {
    this.name = name
  }

  static parse(value: unknown): VerifyingState {
    z.literal('VERIFYING').parse(value)
    return new VerifyingState('VERIFYING')
  }

  transitionGuard(
    context: Parameters<typeof WorkflowTransitionContext.from>[0],
  ): PreconditionResult {
    if (context.to === 'BLOCKED') return { pass: true }
    if (context.state.localVerification.status !== 'passed') {
      return { pass: false, reason: 'Local verification has not passed. Run verify-local first.' }
    }
    if (
      !context.gitInfo.workingTreeClean ||
      context.gitInfo.headCommit !== context.state.localVerification.headCommit
    ) {
      return {
        pass: false,
        reason: 'The worktree no longer matches the verified commit. Run local verification again.',
      }
    }
    return { pass: true }
  }

  onEntry(state: WorkflowState): WorkflowState {
    return state.with({ localVerification: { status: 'not-run' } })
  }
}
