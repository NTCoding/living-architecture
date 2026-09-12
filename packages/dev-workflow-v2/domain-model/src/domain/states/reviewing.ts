import type { PreconditionResult } from '@nt-ai-lab/deterministic-agent-workflow-dsl'
import { z } from 'zod'
import { WorkflowStateError } from '@nt-ai-lab/deterministic-agent-workflow-engine'
import type { WorkflowTransitionContext } from '../workflow-transition-context'
import type { WorkflowState } from '../workflow-types'

/** @riviere-role domain-port
 * @riviere-role-justification State entry receives the aggregate operation that opens a review cycle; it does not load previously created workflow state.
 */
export type ReviewingDependencies = {
  readonly workflow: {
    getState(): WorkflowState
    startReviewCycle(): { readonly pass: boolean; readonly reason?: string }
  }
}

/** @riviere-role value-object */
export class ReviewingState {
  declare private readonly brand: 'ReviewingState'

  readonly name: 'REVIEWING'
  readonly emoji = '📋'
  readonly agentInstructions = 'states/reviewing.md'
  readonly canTransitionTo = ['ADDRESSING_FEEDBACK', 'HUMAN_REVIEWING', 'BLOCKED'] as const
  readonly forbidden = { write: true } as const
  readonly allowedWorkflowOperations = [
    'record-reviewer-status',
    'wait-for-coderabbit-and-close-review-cycle',
  ] as const

  private readonly dependencies: ReviewingDependencies | undefined

  private constructor(name: 'REVIEWING', dependencies?: ReviewingDependencies) {
    this.name = name
    this.dependencies = dependencies
  }

  static parse(value: unknown, dependencies?: ReviewingDependencies): ReviewingState {
    z.literal('REVIEWING').parse(value)
    return new ReviewingState('REVIEWING', dependencies)
  }

  transitionGuard(
    context: Parameters<typeof WorkflowTransitionContext.from>[0],
  ): PreconditionResult {
    const statuses = [...context.state.reviewerStatuses.statusByReviewer().values()]
    const allApproved = statuses.every((status) => status.name() === 'APPROVED')
    const hasOpenFeedback = statuses.some((status) => status.isOpenFeedback())
    if (context.to === 'HUMAN_REVIEWING' && !allApproved)
      return {
        pass: false,
        reason: 'All reviewers and CodeRabbit must approve before human review.',
      }
    if (context.to === 'ADDRESSING_FEEDBACK' && !hasOpenFeedback)
      return { pass: false, reason: 'No reviewer has open feedback to address.' }
    return { pass: true }
  }

  afterEntry(): void {
    if (this.dependencies === undefined)
      throw new WorkflowStateError('Reviewing entry dependencies have not been configured.')
    const result = this.dependencies.workflow.startReviewCycle()
    if (!result.pass)
      throw new WorkflowStateError(result.reason ?? 'Unable to start a review cycle.')
  }
}
