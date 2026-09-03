import { describe, expect, it } from 'vitest'
import { evaluateCodeRabbitFeedbackPoll } from './coderabbit-feedback-verification'

describe('evaluateCodeRabbitFeedbackPoll', () => {
  it('reports a rate-limit failure', () => {
    expect(
      evaluateCodeRabbitFeedbackPoll(
        {
          reviewDecision: null,
          coderabbitReviewSeen: true,
          coderabbitRateLimited: true,
          unresolvedCount: 0,
          threads: [],
        },
        42,
        2,
        0,
      ),
    ).toStrictEqual({
      type: 'rate-limited',
      reason: 'CodeRabbit rate limited. Wait, then resume AWAITING_PR_FEEDBACK.',
    })
  })

  it('plans a retry until a second clean feedback result is observed', () => {
    expect(
      evaluateCodeRabbitFeedbackPoll(
        {
          reviewDecision: 'APPROVED',
          coderabbitReviewSeen: true,
          unresolvedCount: 0,
          threads: [],
        },
        42,
        2,
        0,
      ),
    ).toStrictEqual({
      type: 'retry',
      consecutiveCleanPolls: 1,
    })
  })

  it('reports a timeout when CodeRabbit feedback is still absent on the final poll', () => {
    expect(
      evaluateCodeRabbitFeedbackPoll(
        {
          reviewDecision: null,
          coderabbitReviewSeen: false,
          unresolvedCount: 0,
          threads: [],
        },
        42,
        1,
        0,
      ),
    ).toStrictEqual({
      type: 'timed-out',
      reason: 'CodeRabbit feedback did not appear within 300000ms for PR #42.',
    })
  })

  it('reports a timeout when only one clean poll has occurred on the final poll', () => {
    expect(
      evaluateCodeRabbitFeedbackPoll(
        {
          reviewDecision: 'APPROVED',
          coderabbitReviewSeen: true,
          unresolvedCount: 0,
          threads: [],
        },
        42,
        1,
        0,
      ),
    ).toStrictEqual({
      type: 'timed-out',
      reason:
        'CodeRabbit feedback was not clean for 2 consecutive polls within 300000ms for PR #42.',
    })
  })

  it('reports the final feedback result', () => {
    expect(
      evaluateCodeRabbitFeedbackPoll(
        {
          reviewDecision: 'CHANGES_REQUESTED',
          coderabbitReviewSeen: true,
          unresolvedCount: 1,
          threads: [],
        },
        42,
        2,
        0,
      ),
    ).toStrictEqual({
      type: 'verified',
      clean: false,
    })
  })
})
