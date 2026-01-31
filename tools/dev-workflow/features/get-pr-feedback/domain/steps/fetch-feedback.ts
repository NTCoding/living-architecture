import type { Step } from '../../../../platform/domain/workflow-execution/workflow-runner'
import { success } from '../../../../platform/domain/workflow-execution/step-result'
import {
  getPRFeedback,
  type FetchRawPRFeedback,
} from '../../../../platform/domain/review-feedback/get-pr-feedback'
import type {
  GetPRFeedbackContext, PRFeedbackStatus 
} from '../feedback-report'
import type { ReviewDecision } from '../../../../platform/domain/review-feedback/review-decision'

export interface FetchFeedbackDeps {
  getMergeableState: (prNumber: number) => Promise<string | null>
  fetchRawPRFeedback: FetchRawPRFeedback
}

function hasNoChangesRequested(decisions: ReviewDecision[]): boolean {
  return !decisions.some((d) => d.state === 'CHANGES_REQUESTED')
}

export function createFetchFeedbackStep(deps: FetchFeedbackDeps): Step<GetPRFeedbackContext> {
  return {
    name: 'fetch-feedback',
    execute: async (ctx) => {
      if (!ctx.prNumber || !ctx.prState) {
        const status: PRFeedbackStatus = {
          branch: ctx.branch,
          state: 'not_found',
          mergeableState: null,
          reviewDecisions: [],
          mergeable: false,
          feedback: [],
          feedbackCount: 0,
        }
        return success(status)
      }

      const isMergedOrClosed = ctx.prState === 'merged' || ctx.prState === 'closed'

      if (isMergedOrClosed && !ctx.includeResolved) {
        const status: PRFeedbackStatus = {
          branch: ctx.branch,
          state: ctx.prState,
          prNumber: ctx.prNumber,
          prUrl: ctx.prUrl,
          mergeableState: null,
          reviewDecisions: [],
          mergeable: false,
          feedback: [],
          feedbackCount: 0,
        }
        return success(status)
      }

      const prFeedback = await getPRFeedback(deps.fetchRawPRFeedback, ctx.prNumber, {includeResolved: ctx.includeResolved,})
      const mergeableState = isMergedOrClosed ? null : await deps.getMergeableState(ctx.prNumber)

      const isMergeable =
        mergeableState === 'clean' &&
        prFeedback.threads.length === 0 &&
        hasNoChangesRequested(prFeedback.reviewDecisions)

      const feedbackCount = prFeedback.threads.length
      const instruction =
        feedbackCount > 1
          ? `Fix ALL ${feedbackCount} feedback items in a single commit. Do not fix-commit-wait in a loop.`
          : undefined

      const status: PRFeedbackStatus = {
        branch: ctx.branch,
        state: ctx.prState,
        prNumber: ctx.prNumber,
        prUrl: ctx.prUrl,
        mergeableState,
        reviewDecisions: prFeedback.reviewDecisions,
        mergeable: isMergeable,
        feedback: prFeedback.threads,
        feedbackCount,
        ...(instruction && { instruction }),
      }

      return success(status)
    },
  }
}
