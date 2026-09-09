import type { PreconditionResult } from '@nt-ai-lab/deterministic-agent-workflow-dsl'
import { z } from 'zod'
import type { WorkflowTransitionContext } from '../workflow-transition-context'
import type { WorkflowState } from '../workflow-types'
import type { WorkflowEvent } from '../workflow-events'
import type { ReadWorkflowPullRequestFeedback } from '../ports/read-pull-request-feedback'
import { WorkflowStateError } from '@nt-ai-lab/deterministic-agent-workflow-engine'

type ReviewingEntryContext = {
  readonly workflow: {
    getState(): WorkflowState
    appendEvent(event: WorkflowEvent): void
    recordReviewerStatus(
      reviewer: 'architecture-review' | 'code-review' | 'bug-scanner' | 'task-check' | 'coderabbit',
      status: 'PENDING' | 'OPEN_FEEDBACK' | 'APPROVED',
    ): { readonly pass: boolean; readonly reason?: string }
  }
  readonly deps: {
    readonly getPrFeedback: ReadWorkflowPullRequestFeedback
    readonly sleepMs: (milliseconds: number) => void
    readonly now: () => string
    readonly emitEvent: (event: WorkflowEvent, state: WorkflowState) => void
  }
}

const CODERABBIT_POLL_INTERVAL_MS = 15_000
const CODERABBIT_MAX_POLLS = 20

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

  private readonly entryContext: ReviewingEntryContext | undefined

  private constructor(name: 'REVIEWING', entryContext?: ReviewingEntryContext) {
    this.name = name
    this.entryContext = entryContext
  }

  static parse(value: unknown): ReviewingState {
    z.literal('REVIEWING').parse(value)
    return new ReviewingState('REVIEWING')
  }

  withEntryContext(entryContext: ReviewingEntryContext): ReviewingState {
    return new ReviewingState(this.name, entryContext)
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
    if (this.entryContext === undefined)
      throw new WorkflowStateError('Reviewing entry dependencies have not been configured.')
    const context = this.entryContext
    const state = context.workflow.getState()
    if (state.prNumber === undefined) return

    const feedback = waitForCodeRabbit(context.deps, state.prNumber)
    if (feedback.coderabbitRateLimited === true) {
      context.deps.emitEvent(
        {
          type: 'transitioned',
          at: context.deps.now(),
          from: 'REVIEWING',
          to: 'BLOCKED',
        },
        state,
      )
      return
    }
    const coderabbitStatus = getCodeRabbitStatus(feedback)
    if (state.reviewerStatuses['coderabbit'] !== coderabbitStatus) {
      context.workflow.recordReviewerStatus('coderabbit', coderabbitStatus)
      context.deps.emitEvent(
        {
          type: 'reviewer-status-recorded',
          at: context.deps.now(),
          reviewer: 'coderabbit',
          status: coderabbitStatus,
        },
        state,
      )
    }

    const statuses = context.workflow.getState().reviewerStatuses
    if (Object.values(statuses).some((status) => status === 'OPEN_FEEDBACK')) {
      context.deps.emitEvent(
        {
          type: 'transitioned',
          at: context.deps.now(),
          from: 'REVIEWING',
          to: 'ADDRESSING_FEEDBACK',
        },
        context.workflow.getState(),
      )
      return
    }
    if (Object.values(statuses).every((status) => status === 'APPROVED')) {
      context.deps.emitEvent(
        {
          type: 'transitioned',
          at: context.deps.now(),
          from: 'REVIEWING',
          to: 'HUMAN_REVIEWING',
        },
        context.workflow.getState(),
      )
    }
  }
}

function waitForCodeRabbit(
  deps: ReviewingEntryContext['deps'],
  prNumber: number,
  remainingPolls = CODERABBIT_MAX_POLLS,
): ReturnType<ReadWorkflowPullRequestFeedback> {
  const feedback = deps.getPrFeedback(prNumber)
  if (feedback.coderabbitReviewSeen || feedback.coderabbitRateLimited || remainingPolls === 0)
    return feedback
  deps.sleepMs(CODERABBIT_POLL_INTERVAL_MS)
  return waitForCodeRabbit(deps, prNumber, remainingPolls - 1)
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
