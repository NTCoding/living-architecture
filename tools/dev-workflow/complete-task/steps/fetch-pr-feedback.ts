import type { Step } from '../../workflow-runner/workflow-runner'
import {
  success, failure 
} from '../../workflow-runner/workflow-runner'
import { getUnresolvedPRFeedback } from '../../external-clients/pr-feedback'
import type { CompleteTaskContext } from '../complete-task'

export const fetchPRFeedback: Step<CompleteTaskContext> = async (ctx) => {
  if (!ctx.prNumber) {
    return failure({
      type: 'fix_errors',
      details: 'No PR number available',
    })
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

    return failure({
      type: 'resolve_feedback',
      details: summary,
    })
  }

  return success()
}
