import type { ReadWorkflowPullRequestFeedback } from './ports/read-pull-request-feedback'

type PullRequestFeedbackReadSuccess = {
  readonly ok: true
  readonly feedback: ReturnType<ReadWorkflowPullRequestFeedback>
}
type PullRequestFeedbackReadFailure = { readonly ok: false; readonly reason: string }
type PullRequestFeedbackReadResult = PullRequestFeedbackReadSuccess | PullRequestFeedbackReadFailure
/** @riviere-role domain-service
 * @riviere-role-justification This boundary converts external feedback-reader exceptions into a result that the workflow can persist before blocking.
 */
export function readWorkflowPullRequestFeedback(
  getPrFeedback: ReadWorkflowPullRequestFeedback,
  prNumber: number,
  includeCodeRabbitStatus: boolean,
): PullRequestFeedbackReadResult {
  try {
    return { ok: true, feedback: getPrFeedback(prNumber, { includeCodeRabbitStatus }) }
  } catch (error) {
    return { ok: false, reason: `Unable to fetch PR feedback: ${String(error)}` }
  }
}
