import type { PreconditionResult } from '@nt-ai-lab/deterministic-agent-workflow-dsl'
import { z } from 'zod'
import type { WorkflowTransitionContext } from '../workflow-transition-context'

/** @riviere-role value-object */
export class SubmittingPrState {
  declare private readonly brand: 'SubmittingPrState'

  readonly name: 'SUBMITTING_PR'
  readonly emoji = '🚀'
  readonly agentInstructions = 'states/submitting_pr.md'
  readonly canTransitionTo = ['REVIEWING', 'AWAITING_CI', 'BLOCKED'] as const
  readonly allowedWorkflowOperations = ['record-pr', 'create-pr'] as const
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
    if (context.to === 'BLOCKED') return { pass: true }
    if (context.to === 'REVIEWING') {
      if (context.state.pullRequestSnapshot === undefined) {
        return {
          pass: false,
          reason: 'A complete PR snapshot is required before review. Run create-pr first.',
        }
      }
      if (
        !context.state.hasPassedVerificationFor(context.gitInfo.headCommit) ||
        context.state.pullRequestSnapshot.headRevision !== context.gitInfo.headCommit ||
        !context.gitInfo.workingTreeClean
      ) {
        return {
          pass: false,
          reason: 'The PR and worktree must match the locally verified commit before review.',
        }
      }
      return { pass: true }
    }
    if (!context.state.prNumber) {
      return { pass: false, reason: 'prNumber not set. Use record-pr <number> first.' }
    }
    if (
      !context.state.architectureReviewPassed ||
      !context.state.codeReviewPassed ||
      !context.state.bugScannerPassed ||
      !context.state.taskCheckPassed
    ) {
      return { pass: false, reason: 'Complete the workflow review before awaiting CI.' }
    }
    return { pass: true }
  }
}
