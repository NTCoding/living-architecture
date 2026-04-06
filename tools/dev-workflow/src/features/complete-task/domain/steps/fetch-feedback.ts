import type { Step } from '../../../../platform/domain/workflow-execution/workflow-runner'
import {
  success, failure 
} from '../../../../platform/domain/workflow-execution/step-result'
import {
  getPRFeedback,
  type FetchRawPRFeedback,
} from '../../../../platform/domain/review-feedback/get-pr-feedback'
import type { CompleteTaskContext } from '../task-to-complete'

/** @riviere-role value-object */
export interface FetchPRFeedbackDeps {fetchRawPRFeedback: FetchRawPRFeedback}

/** @riviere-role domain-service */
export function createFetchPRFeedbackStep(deps: FetchPRFeedbackDeps): Step<CompleteTaskContext> {
  return {
    name: 'fetch-pr-feedback',
    execute: async (ctx) => {
      if (!ctx.prNumber) {
        return failure({
          type: 'fix_errors',
          details: 'No PR number available',
        })
      }

      const prFeedback = await getPRFeedback(deps.fetchRawPRFeedback, ctx.prNumber)

      const changesRequested = prFeedback.reviewDecisions.filter(
        (d) => d.state === 'CHANGES_REQUESTED',
      )

      if (changesRequested.length > 0 || prFeedback.threads.length > 0) {
        const parts: string[] = []

        if (changesRequested.length > 0) {
          const reviewers = changesRequested.map((d) => d.reviewer).join(', ')
          parts.push(`Changes requested by: ${reviewers}`)
        }

        if (prFeedback.threads.length > 0) {
          const threadSummary = prFeedback.threads
            .map((f) => {
              const truncated = f.body.length > 100
              const preview = truncated ? `${f.body.slice(0, 100)}...` : f.body
              return `- ${f.location}: ${preview}`
            })
            .join('\n')
          parts.push(`Unresolved threads:\n${threadSummary}`)
        }

        return failure({
          type: 'resolve_feedback',
          details: parts.join('\n\n'),
        })
      }

      return success()
    },
  }
}
