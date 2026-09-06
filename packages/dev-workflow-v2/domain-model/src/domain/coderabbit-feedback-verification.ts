import type { ReadWorkflowPullRequestFeedback } from './ports/read-pull-request-feedback'

type CodeRabbitFeedbackPollResult =
  | { readonly type: 'retry' }
  | { readonly type: 'timed-out'; readonly reason: string }
  | { readonly type: 'verified'; readonly clean: boolean }

/**
 * @riviere-role domain-service
 * @riviere-role-justification The polling decision is a pure CodeRabbit feedback rule reused whenever MaintainerWorkflow observes pull request feedback; the aggregate owns the resulting wait, events, and transitions.
 */
export function evaluateCodeRabbitFeedbackPoll(
  feedback: ReturnType<ReadWorkflowPullRequestFeedback>,
  prNumber: number,
  attemptsRemaining: number,
  rateLimitPreviouslyObserved: boolean,
): CodeRabbitFeedbackPollResult {
  const available =
    rateLimitPreviouslyObserved ||
    feedback.coderabbitRateLimitEvidence !== undefined ||
    (feedback.coderabbitReviewSeen && feedback.coderabbitRateLimited !== true)
  if (!available) {
    if (attemptsRemaining <= 1) {
      return {
        type: 'timed-out',
        reason: `CodeRabbit feedback did not appear within 300000ms for PR #${String(prNumber)}.`,
      }
    }
    return { type: 'retry' }
  }
  return {
    type: 'verified',
    clean: feedback.reviewDecision !== 'CHANGES_REQUESTED' && feedback.unresolvedCount === 0,
  }
}
