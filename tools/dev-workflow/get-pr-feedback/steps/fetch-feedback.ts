import type { Step } from '../../workflow-runner/workflow-runner'
import { success } from '../../workflow-runner/workflow-runner'
import { getRepoInfo } from '../../external-clients/github'
import { getUnresolvedPRFeedback } from '../../external-clients/pr-feedback'
import type { GetPRFeedbackContext } from '../get-pr-feedback'

interface PRFeedbackStatus {
  branch: string
  prNumber: number | undefined
  prUrl?: string
  mergeable: boolean
  unresolvedFeedback: Array<{
    threadId: string
    location: string
    author: string
    body: string
  }>
  feedbackCount: number
  message?: string
}

export const fetchFeedback: Step<GetPRFeedbackContext> = {
  name: 'fetch-feedback',
  execute: async (ctx) => {
    if (!ctx.prNumber) {
      const status: PRFeedbackStatus = {
        branch: ctx.branch,
        prNumber: undefined,
        mergeable: false,
        unresolvedFeedback: [],
        feedbackCount: 0,
        message: `No open PR found for branch "${ctx.branch}"`,
      }
      return success(status)
    }

    const [feedback, repoInfo] = await Promise.all([
      getUnresolvedPRFeedback(ctx.prNumber),
      getRepoInfo(),
    ])

    const status: PRFeedbackStatus = {
      branch: ctx.branch,
      prNumber: ctx.prNumber,
      prUrl: `https://github.com/${repoInfo.owner}/${repoInfo.repo}/pull/${ctx.prNumber}`,
      mergeable: feedback.length === 0,
      unresolvedFeedback: feedback,
      feedbackCount: feedback.length,
    }

    return success(status)
  },
}
