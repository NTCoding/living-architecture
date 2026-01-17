import type { Step } from '../../workflow-runner/workflow-runner'
import {
  success, failure 
} from '../../workflow-runner/workflow-runner'
import { getUnresolvedPRFeedback } from '../../external-clients/pr-feedback'

export const fetchPRFeedback: Step = async (ctx) => {
  if (!ctx.prNumber) {
    return failure('fix_errors', 'No PR number available')
  }

  const feedback = await getUnresolvedPRFeedback(ctx.prNumber)

  if (feedback.length > 0) {
    const summary = feedback
      .map((f) => {
        const truncated = f.body.length > 100
        const preview = truncated ? `${f.body.slice(0, 100)}...` : f.body
        return `- ${f.location}: ${preview}`
      })
      .join('\n')

    return failure('resolve_feedback', summary)
  }

  return success()
}
