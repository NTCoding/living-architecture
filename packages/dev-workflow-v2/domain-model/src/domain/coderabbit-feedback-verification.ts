import type { ReadWorkflowPullRequestFeedback } from './ports/read-pull-request-feedback'

type CodeRabbitFeedbackPollResult =
  | {
      readonly type: 'retry'
    }
  | {
      readonly type: 'timed-out'
      readonly reason: string
    }
  | {
      readonly type: 'verified'
      readonly clean: boolean
    }

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

type FeedbackAssessment =
  | {
      readonly status: 'clean'
      readonly clean: true
    }
  | {
      readonly status: 'changes-requested'
      readonly reason: string
    }
  | {
      readonly status: 'unresolved'
      readonly reason: string
    }
  | {
      readonly status: 'waiting-for-coderabbit'
      readonly reason: string
    }
  | {
      readonly status: 'unverified'
      readonly reason: string
    }

/**
 * @riviere-role domain-service
 * @riviere-role-justification Assesses whether the current PR feedback is clean enough to leave ADDRESSING_FEEDBACK without coupling the aggregate to the poll evaluation.
 */
export function assessFeedbackAddressed(
  feedback: ReturnType<ReadWorkflowPullRequestFeedback>,
  poll: CodeRabbitFeedbackPollResult,
): FeedbackAssessment {
  if (feedback.reviewDecision === 'CHANGES_REQUESTED' && feedback.unresolvedCount > 0) {
    return {
      status: 'changes-requested',
      reason: `PR still has CHANGES_REQUESTED review status and ${feedback.unresolvedCount} unresolved feedback threads. Resolve all feedback or transition to BLOCKED.`,
    }
  }
  if (feedback.reviewDecision === 'CHANGES_REQUESTED') {
    return {
      status: 'waiting-for-coderabbit',
      reason:
        'PR has no unresolved feedback threads, but CodeRabbit still reports CHANGES_REQUESTED while it processes new commits. Wait and periodically run verify-feedback-addressed again. Do not transition to BLOCKED.',
    }
  }
  if (feedback.unresolvedCount > 0) {
    return {
      status: 'unresolved',
      reason: `PR still has ${feedback.unresolvedCount} unresolved feedback threads. Resolve all feedback or transition to BLOCKED.`,
    }
  }
  if (poll.type !== 'verified') {
    return {
      status: 'unverified',
      reason:
        'CodeRabbit has not completed a verified review for the current head. Wait and retry verification.',
    }
  }
  return {
    status: 'clean',
    clean: true,
  }
}
