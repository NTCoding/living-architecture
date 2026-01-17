import type { Step } from '../../workflow-runner/workflow-runner'
import { success } from '../../workflow-runner/workflow-runner'
import { github } from '../../external-clients/github'
import { getUnresolvedPRFeedback } from '../../external-clients/pr-feedback'
import type { GetPRFeedbackContext } from '../get-pr-feedback'

type PRState = 'merged' | 'open' | 'closed' | 'not_found'

interface PRFeedbackStatus {
  branch: string
  state: PRState
  prNumber?: number
  prUrl?: string
  mergeableState: string | null
  mergeable: boolean
  unresolvedFeedback: Array<{
    threadId: string
    location: string
    author: string
    body: string
  }>
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
        unresolvedFeedback: [],
        feedbackCount: 0,
      }
      return success(status)
    }

    if (ctx.prState === 'merged' || ctx.prState === 'closed') {
      const status: PRFeedbackStatus = {
        branch: ctx.branch,
        state: ctx.prState,
        prNumber: ctx.prNumber,
        prUrl: ctx.prUrl,
        mergeableState: null,
        mergeable: false,
        unresolvedFeedback: [],
        feedbackCount: 0,
      }
      return success(status)
    }

    const [feedback, mergeableState] = await Promise.all([
      getUnresolvedPRFeedback(ctx.prNumber),
      github.getMergeableState(ctx.prNumber),
    ])

    const status: PRFeedbackStatus = {
      branch: ctx.branch,
      state: ctx.prState,
      prNumber: ctx.prNumber,
      prUrl: ctx.prUrl,
      mergeableState,
      mergeable: mergeableState === 'clean' && feedback.length === 0,
      unresolvedFeedback: feedback,
      feedbackCount: feedback.length,
    }

    return success(status)
  },
}
