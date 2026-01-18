import type { Step } from '../../workflow-runner/workflow-runner'
import { success } from '../../workflow-runner/workflow-runner'
import { github } from '../../external-clients/github'
import {
  getPRFeedback,
  type FormattedFeedbackItem,
  type ReviewDecision,
} from '../../external-clients/pr-feedback'
import type { GetPRFeedbackContext } from '../get-pr-feedback'

type PRState = 'merged' | 'open' | 'closed' | 'not_found'

interface PRFeedbackStatus {
  branch: string
  state: PRState
  prNumber?: number
  prUrl?: string
  mergeableState: string | null
  reviewDecisions: ReviewDecision[]
  mergeable: boolean
  feedback: FormattedFeedbackItem[]
  feedbackCount: number
}

function hasNoChangesRequested(decisions: ReviewDecision[]): boolean {
  return !decisions.some((d) => d.state === 'CHANGES_REQUESTED')
}

export const fetchFeedback: Step<GetPRFeedbackContext> = {
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

    const prFeedback = await getPRFeedback(ctx.prNumber, { includeResolved: ctx.includeResolved })
    const mergeableState = isMergedOrClosed ? null : await github.getMergeableState(ctx.prNumber)

    const isMergeable =
      mergeableState === 'clean' &&
      prFeedback.threads.length === 0 &&
      hasNoChangesRequested(prFeedback.reviewDecisions)

    const status: PRFeedbackStatus = {
      branch: ctx.branch,
      state: ctx.prState,
      prNumber: ctx.prNumber,
      prUrl: ctx.prUrl,
      mergeableState,
      reviewDecisions: prFeedback.reviewDecisions,
      mergeable: isMergeable,
      feedback: prFeedback.threads,
      feedbackCount: prFeedback.threads.length,
    }

    return success(status)
  },
}
