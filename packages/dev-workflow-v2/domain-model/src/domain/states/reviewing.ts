import type { PreconditionResult } from '@nt-ai-lab/deterministic-agent-workflow-dsl'
import { z } from 'zod'
import type { WorkflowTransitionContext } from '../workflow-transition-context'
import type { WorkflowState } from '../workflow-types'
import type { ReviewOutcome } from '../workflow'
import type { ReadWorkflowPullRequestFeedback } from '../ports/read-pull-request-feedback'
import type { ReviewAgentName, ReviewLauncher } from '../ports/review-launcher'
import { WorkflowStateError } from '@nt-ai-lab/deterministic-agent-workflow-engine'

export type ReviewingDependencies = {
  readonly workflow: {
    getState(): WorkflowState
    getPullRequestNumber(): number
    recordReviewerStatus(
      reviewer: 'architecture-review' | 'code-review' | 'bug-scanner' | 'task-check' | 'coderabbit',
      status: 'PENDING' | 'OPEN_FEEDBACK' | 'APPROVED',
    ): { readonly pass: boolean; readonly reason?: string }
    transition(target: 'ADDRESSING_FEEDBACK' | 'HUMAN_REVIEWING' | 'BLOCKED'): {
      readonly pass: boolean
      readonly reason?: string
    }
    reviewOutcome(options: { readonly ignoreCodeRabbit?: boolean }): ReviewOutcome
  }
  readonly deps: {
    readonly getPrFeedback: ReadWorkflowPullRequestFeedback
    readonly sleepMs: (milliseconds: number) => void
    readonly now: () => string
    readonly reviewLauncher: ReviewLauncher
  }
}

const CODERABBIT_POLL_INTERVAL_MS = 15_000

/** @riviere-role value-object */
export class ReviewingState {
  declare private readonly brand: 'ReviewingState'

  readonly name: 'REVIEWING'
  readonly emoji = '📋'
  readonly agentInstructions = 'states/reviewing.md'
  readonly canTransitionTo = [
    'REVIEWING',
    'ADDRESSING_FEEDBACK',
    'HUMAN_REVIEWING',
    'BLOCKED',
  ] as const
  readonly forbidden = { write: true } as const
  readonly allowedWorkflowOperations = ['record-reviewer-status'] as const

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
    const statuses = Object.values(context.state.reviewerStatuses)
    const allApproved = statuses.every((status) => status === 'APPROVED')
    const hasOpenFeedback = statuses.some((status) => status === 'OPEN_FEEDBACK')
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
    const context = this.dependencies
    const pullRequestNumber = context.workflow.getPullRequestNumber()
    const state = context.workflow.getState()
    const reviewers: readonly ReviewAgentName[] = [
      'architecture-review',
      'code-review',
      'bug-scanner',
      'task-check',
    ]
    const outstandingReviewers = reviewers.filter(
      (reviewer) => state.reviewerStatuses[reviewer] !== 'APPROVED',
    )
    context.deps.reviewLauncher.run(
      outstandingReviewers.map((reviewer) => ({
        pullRequestNumber,
        reviewer,
        workflowState: context.workflow.getState(),
      })),
    )

    const feedback = waitForReviewCompletion(context.deps, pullRequestNumber, state)
    const skipCodeRabbit = feedback.coderabbitRateLimited === true
    for (const reviewer of reviewers) {
      const status = feedback.reviewerStatuses[reviewer]
      if (context.workflow.getState().reviewerStatuses[reviewer] !== status)
        context.workflow.recordReviewerStatus(reviewer, status)
    }
    if (!skipCodeRabbit) {
      const coderabbitStatus = getCodeRabbitStatus(feedback)
      if (context.workflow.getState().reviewerStatuses['coderabbit'] !== coderabbitStatus)
        context.workflow.recordReviewerStatus('coderabbit', coderabbitStatus)
    }

    switch (context.workflow.reviewOutcome({ ignoreCodeRabbit: skipCodeRabbit })) {
      case 'OPEN_FEEDBACK':
        context.workflow.transition('ADDRESSING_FEEDBACK')
        return
      case 'APPROVED':
        context.workflow.transition('HUMAN_REVIEWING')
        return
      case 'PENDING':
        throw new WorkflowStateError(
          'Reviewing completion was evaluated before every reviewer returned a result.',
        )
    }
  }
}

function waitForReviewCompletion(
  deps: ReviewingDependencies['deps'],
  prNumber: number,
  state: WorkflowState,
): ReturnType<ReadWorkflowPullRequestFeedback> {
  for (;;) {
    const feedback = deps.getPrFeedback(prNumber)
    const localReviewersComplete = (
      ['architecture-review', 'code-review', 'bug-scanner', 'task-check'] as const
    ).every(
      (reviewer) =>
        state.reviewerStatuses[reviewer] === 'APPROVED' ||
        feedback.reviewerStatuses[reviewer] !== 'PENDING',
    )
    if (localReviewersComplete && (feedback.coderabbitReviewSeen || feedback.coderabbitRateLimited))
      return feedback
    deps.sleepMs(CODERABBIT_POLL_INTERVAL_MS)
  }
}

function getCodeRabbitStatus(feedback: {
  readonly coderabbitReviewSeen: boolean
  readonly coderabbitRateLimited?: boolean
  readonly threads: readonly {
    readonly comments: readonly { readonly author: { readonly login: string } | null }[]
  }[]
}): 'PENDING' | 'OPEN_FEEDBACK' | 'APPROVED' {
  const hasOpenCodeRabbitThread = feedback.threads.some((thread) =>
    thread.comments.some(
      (comment) =>
        comment.author?.login === 'coderabbitai' || comment.author?.login === 'coderabbitai[bot]',
    ),
  )
  if (hasOpenCodeRabbitThread) return 'OPEN_FEEDBACK'
  return feedback.coderabbitReviewSeen ? 'APPROVED' : 'PENDING'
}
