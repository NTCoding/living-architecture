import type { Step } from '../../workflow-runner/workflow-runner'
import {
  success, failure 
} from '../../workflow-runner/workflow-runner'
import { github } from '../../external-clients/github'

function formatFeedbackLocation(file?: string, line?: number): string {
  if (!file) {
    return 'PR-level'
  }
  if (!line) {
    return file
  }
  return `${file}:${line}`
}

export const fetchPRFeedback: Step = async (ctx) => {
  if (!ctx.prNumber) {
    return failure('fix_errors', 'No PR number available')
  }

  const feedback = await github.getUnresolvedFeedback(ctx.prNumber)

  if (feedback.length > 0) {
    const feedbackSummary = feedback
      .map((f) => {
        const location = formatFeedbackLocation(f.file, f.line)
        return `- ${location}: ${f.body.slice(0, 100)}...`
      })
      .join('\n')

    return failure('resolve_feedback', feedbackSummary)
  }

  return success()
}
