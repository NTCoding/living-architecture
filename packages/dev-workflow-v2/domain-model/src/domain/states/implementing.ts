import type { PreconditionResult } from '@nt-ai-lab/deterministic-agent-workflow-dsl'
import { z } from 'zod'
import { Reviewers } from '../reviews/reviewers'
import { ReviewerStatus } from '../reviews/statuses'
import { ReviewerStatuses } from '../reviews/reviewer-statuses'
import type { WorkflowState } from '../workflow-types'
import type { WorkflowTransitionContext } from '../workflow-transition-context'

/** @riviere-role value-object */
export class ImplementingState {
  declare private readonly brand: 'ImplementingState'

  readonly name: 'IMPLEMENTING'
  readonly emoji = '🔨'
  readonly agentInstructions = 'states/implementing.md'
  readonly canTransitionTo = ['SUBMITTING_PR', 'BLOCKED'] as const
  readonly allowedWorkflowOperations = ['record-issue', 'record-branch'] as const
  readonly forbidden = { write: true } as const

  private constructor(name: 'IMPLEMENTING') {
    this.name = name
  }

  static parse(value: unknown): ImplementingState {
    z.literal('IMPLEMENTING').parse(value)
    return new ImplementingState('IMPLEMENTING')
  }

  transitionGuard(
    context: Parameters<typeof WorkflowTransitionContext.from>[0],
  ): PreconditionResult {
    if (context.to === 'BLOCKED') return { pass: true }
    if (context.state.prNumber !== undefined) {
      return {
        pass: false,
        reason: 'A pull request has already been recorded. Submitting another is not allowed.',
      }
    }
    if (!context.gitInfo.hasCommitsVsDefault) {
      return {
        pass: false,
        reason: 'No commits beyond default branch. Write code and commit before reviewing.',
      }
    }
    if (!context.gitInfo.workingTreeClean) {
      return {
        pass: false,
        reason: 'Working tree is not clean. Commit all changes before transitioning.',
      }
    }
    if (!context.state.githubIssue) {
      return {
        pass: false,
        reason: 'No issue recorded. Run record-issue first.',
      }
    }
    if (context.state.featureBranch === undefined) {
      return {
        pass: false,
        reason: 'No branch recorded. Run record-branch first.',
      }
    }
    return { pass: true }
  }

  onEntry(state: WorkflowState): WorkflowState {
    return state.with({
      reviewerStatuses: ReviewerStatuses.fromInitialState(
        Reviewers.singleton().all(),
        ReviewerStatus.parse('PENDING'),
      ).toJSON(),
    })
  }
}
