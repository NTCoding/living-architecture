import type { ReadWorkflowPullRequestFeedback } from './ports/read-pull-request-feedback'
type CodeRabbitFeedbackPollResult =
  | { readonly type: 'retry' }
  | { readonly type: 'timed-out'; readonly reason: string }
  | { readonly type: 'verified'; readonly clean: boolean }
function evaluateFeedback(
  feedback: ReturnType<ReadWorkflowPullRequestFeedback>,
  prNumber: number,
  attemptsRemaining: number,
  rateLimitPreviouslyObserved: boolean,
): CodeRabbitFeedbackPollResult {
  const available =
    rateLimitPreviouslyObserved ||
    feedback.coderabbitRateLimitEvidence !== undefined ||
    (feedback.coderabbitReviewSeen && feedback.coderabbitRateLimited !== true)
  if (!available)
    return attemptsRemaining <= 1
      ? {
          type: 'timed-out',
          reason: `CodeRabbit feedback did not appear within 300000ms for PR #${String(prNumber)}.`,
        }
      : { type: 'retry' }
  return {
    type: 'verified',
    clean: feedback.reviewDecision !== 'CHANGES_REQUESTED' && feedback.unresolvedCount === 0,
  }
}

const POLL_INTERVAL_MS = 15_000
const MAX_ATTEMPTS = Math.floor(300_000 / POLL_INTERVAL_MS) + 1
type FeedbackRead =
  | { readonly feedback: ReturnType<ReadWorkflowPullRequestFeedback> }
  | { readonly reason: string }
function readFeedback(input: Parameters<typeof pollCodeRabbitFeedback>[0]): FeedbackRead {
  try {
    return {
      feedback: input.getFeedback(input.prNumber, {
        includeCodeRabbitStatus: !input.alreadyRateLimited,
      }),
    }
  } catch (error) {
    return { reason: `Unable to fetch PR feedback: ${String(error)}` }
  }
}
function poll(
  input: Parameters<typeof pollCodeRabbitFeedback>[0],
  attemptsRemaining: number,
): void {
  const result = readFeedback(input)
  if ('reason' in result) return input.onFailure(result.reason)
  const outcome = evaluateFeedback(
    result.feedback,
    input.prNumber,
    attemptsRemaining,
    input.alreadyRateLimited,
  )
  if (outcome.type === 'timed-out') return input.onFailure(outcome.reason)
  if (outcome.type === 'retry') {
    input.sleepMs(POLL_INTERVAL_MS)
    return poll(input, attemptsRemaining - 1)
  }
  input.onFeedback(result.feedback, outcome.clean)
  if (outcome.clean) input.onClean()
  else input.onActionableFeedback()
}
/** @riviere-role domain-service
 * @riviere-role-justification This policy drives bounded CodeRabbit observation and returns only observed feedback decisions; MaintainerWorkflow owns its durable events and state transitions.
 */
export function pollCodeRabbitFeedback(input: {
  readonly prNumber: number
  readonly alreadyRateLimited: boolean
  readonly getFeedback: ReadWorkflowPullRequestFeedback
  readonly sleepMs: (ms: number) => void
  readonly onFeedback: (
    feedback: ReturnType<ReadWorkflowPullRequestFeedback>,
    clean: boolean,
  ) => void
  readonly onClean: () => void
  readonly onActionableFeedback: () => void
  readonly onFailure: (reason: string) => void
}): void {
  poll(input, MAX_ATTEMPTS)
}
