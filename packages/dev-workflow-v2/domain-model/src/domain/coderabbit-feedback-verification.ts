import type { ReadWorkflowPullRequestFeedback } from './ports/read-pull-request-feedback'

const CODERABBIT_RATE_LIMIT_REASON =
  'CodeRabbit rate limited. Wait, then resume AWAITING_PR_FEEDBACK.'
const PR_FEEDBACK_TIMEOUT_MS = 300_000
const REQUIRED_CONSECUTIVE_CLEAN_CODERABBIT_POLLS = 2

type CodeRabbitFeedbackRateLimited = {
  readonly type: 'rate-limited'
  readonly reason: string
}
type CodeRabbitFeedbackAvailable = {
  readonly type: 'available'
  readonly clean: boolean
}
type CodeRabbitFeedbackClassification = CodeRabbitFeedbackRateLimited | CodeRabbitFeedbackAvailable
type CodeRabbitFeedbackPollResult =
  | CodeRabbitFeedbackRateLimited
  | CodeRabbitFeedbackRetry
  | CodeRabbitFeedbackTimedOut
  | CodeRabbitFeedbackVerified
type CodeRabbitFeedbackRetry = {
  readonly type: 'retry'
  readonly consecutiveCleanPolls: number
}
type CodeRabbitFeedbackTimedOut = {
  readonly type: 'timed-out'
  readonly reason: string
}
type CodeRabbitFeedbackVerified = {
  readonly type: 'verified'
  readonly clean: boolean
}

function classifyCodeRabbitFeedback(
  feedback: ReturnType<ReadWorkflowPullRequestFeedback>,
): CodeRabbitFeedbackClassification {
  if (feedback.coderabbitRateLimited === true) {
    return {
      type: 'rate-limited',
      reason: CODERABBIT_RATE_LIMIT_REASON,
    }
  }

  return {
    type: 'available',
    clean: feedback.reviewDecision !== 'CHANGES_REQUESTED' && feedback.unresolvedCount === 0,
  }
}

/**
 * @riviere-role domain-service
 * @riviere-role-justification The polling decision is a pure CodeRabbit feedback rule reused whenever MaintainerWorkflow observes pull request feedback; the aggregate owns the resulting wait, events, and transitions.
 */
export function evaluateCodeRabbitFeedbackPoll(
  feedback: ReturnType<ReadWorkflowPullRequestFeedback>,
  prNumber: number,
  attemptsRemaining: number,
  consecutiveCleanPolls: number,
): CodeRabbitFeedbackPollResult {
  const verification = classifyCodeRabbitFeedback(feedback)
  if (verification.type === 'rate-limited') return verification
  if (!feedback.coderabbitReviewSeen) {
    if (attemptsRemaining <= 1) {
      return {
        type: 'timed-out',
        reason: `CodeRabbit feedback did not appear within ${PR_FEEDBACK_TIMEOUT_MS}ms for PR #${prNumber}.`,
      }
    }
    return {
      type: 'retry',
      consecutiveCleanPolls: 0,
    }
  }

  const nextConsecutiveCleanPolls = verification.clean ? consecutiveCleanPolls + 1 : 0
  if (
    verification.clean &&
    nextConsecutiveCleanPolls < REQUIRED_CONSECUTIVE_CLEAN_CODERABBIT_POLLS
  ) {
    if (attemptsRemaining <= 1) {
      return {
        type: 'timed-out',
        reason: `CodeRabbit feedback was not clean for ${REQUIRED_CONSECUTIVE_CLEAN_CODERABBIT_POLLS} consecutive polls within ${PR_FEEDBACK_TIMEOUT_MS}ms for PR #${prNumber}.`,
      }
    }
    return {
      type: 'retry',
      consecutiveCleanPolls: nextConsecutiveCleanPolls,
    }
  }
  return {
    type: 'verified',
    clean: verification.clean,
  }
}
