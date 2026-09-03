import type { ReadWorkflowPullRequestFeedback } from './ports/read-pull-request-feedback'

const CODERABBIT_RATE_LIMIT_REASON =
  'CodeRabbit rate limited. Wait, then resume AWAITING_PR_FEEDBACK.'
const PR_FEEDBACK_TIMEOUT_MS = 300_000
const REQUIRED_CONSECUTIVE_CLEAN_CODERABBIT_POLLS = 2

function classifyCodeRabbitFeedback(feedback: ReturnType<ReadWorkflowPullRequestFeedback>):
  | {
      readonly type: 'rate-limited'
      readonly reason: string
    }
  | {
      readonly type: 'available'
      readonly clean: boolean
    } {
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
):
  | {
      readonly type: 'rate-limited'
      readonly reason: string
    }
  | {
      readonly type: 'retry'
      readonly consecutiveCleanPolls: number
    }
  | {
      readonly type: 'timed-out'
      readonly reason: string
    }
  | {
      readonly type: 'verified'
      readonly clean: boolean
    } {
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
    nextConsecutiveCleanPolls < REQUIRED_CONSECUTIVE_CLEAN_CODERABBIT_POLLS &&
    attemptsRemaining > 1
  ) {
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
