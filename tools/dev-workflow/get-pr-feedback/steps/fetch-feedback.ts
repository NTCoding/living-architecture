import type { Step } from '../../workflow-runner/workflow-runner'
import { success } from '../../workflow-runner/workflow-runner'
import { github } from '../../external-clients/github'
import {
  getPRFeedback, type FormattedFeedbackItem 
} from '../../external-clients/pr-feedback'
import type { GetPRFeedbackContext } from '../get-pr-feedback'

type PRState = 'merged' | 'open' | 'closed' | 'not_found'

interface PRFeedbackStatus {
  branch: string
  state: PRState
  prNumber?: number
  prUrl?: string
  mergeableState: string | null
  mergeable: boolean
  feedback: FormattedFeedbackItem[]
  feedbackCount: number
}

export const fetchFeedback: Step<GetPRFeedbackContext> = {
  name: 'fetch-feedback',
  execute: async (ctx) => {
    if (!ctx.prNumber || !ctx.prState) {
      const status: PRFeedbackStatus = {
        branch: ctx.branch,
        state: 'not_found',
        mergeableState: null,
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
        mergeable: false,
        feedback: [],
        feedbackCount: 0,
      }
      return success(status)
    }

    const feedback = await getPRFeedback(ctx.prNumber, { includeResolved: ctx.includeResolved })
    const mergeableState = isMergedOrClosed ? null : await github.getMergeableState(ctx.prNumber)

    const status: PRFeedbackStatus = {
      branch: ctx.branch,
      state: ctx.prState,
      prNumber: ctx.prNumber,
      prUrl: ctx.prUrl,
      mergeableState,
      mergeable: mergeableState === 'clean' && feedback.length === 0,
      feedback,
      feedbackCount: feedback.length,
    }

    return success(status)
  },
}
