import { describe, expect, it } from 'vitest'
import { evaluateCodeRabbitFeedbackPoll } from './coderabbit-feedback-verification'
import { rateLimitEvidence } from './__fixtures__/coderabbit-rate-limit-evidence'

const pendingFeedback = {
  reviewDecision: null,
  coderabbitReviewSeen: false,
  unresolvedCount: 0,
  threads: [],
}

describe('evaluateCodeRabbitFeedbackPoll', () => {
  it('accepts demonstrated completion without counting repeated empty polls', () => {
    expect(
      evaluateCodeRabbitFeedbackPoll(
        { ...pendingFeedback, coderabbitReviewSeen: true },
        99,
        1,
        false,
      ),
    ).toStrictEqual({ type: 'verified', clean: true })
  })

  it('retries pending review work even when no threads exist', () => {
    expect(evaluateCodeRabbitFeedbackPoll(pendingFeedback, 99, 2, false)).toStrictEqual({
      type: 'retry',
    })
  })

  it('fails closed when the final poll still lacks completion evidence', () => {
    expect(evaluateCodeRabbitFeedbackPoll(pendingFeedback, 99, 1, false)).toStrictEqual({
      type: 'timed-out',
      reason: 'CodeRabbit feedback did not appear within 300000ms for PR #99.',
    })
  })

  it('allows the approved skip when verified rate-limit evidence is present', () => {
    expect(
      evaluateCodeRabbitFeedbackPoll(
        {
          ...pendingFeedback,
          coderabbitRateLimited: true,
          coderabbitRateLimitEvidence: rateLimitEvidence,
        },
        99,
        1,
        false,
      ),
    ).toStrictEqual({ type: 'verified', clean: true })
  })

  it('does not allow an unsupported rate-limit claim to establish readiness', () => {
    expect(
      evaluateCodeRabbitFeedbackPoll(
        { ...pendingFeedback, coderabbitReviewSeen: true, coderabbitRateLimited: true },
        99,
        2,
        false,
      ),
    ).toStrictEqual({ type: 'retry' })
  })

  it('preserves an earlier PR-wide skip while a later head is pending', () => {
    expect(evaluateCodeRabbitFeedbackPoll(pendingFeedback, 99, 1, true)).toStrictEqual({
      type: 'verified',
      clean: true,
    })
  })

  it.each([
    { reviewDecision: 'CHANGES_REQUESTED', unresolvedCount: 0 },
    { reviewDecision: null, unresolvedCount: 1 },
  ])('does not let a rate-limit skip dismiss outstanding feedback %j', (feedback) => {
    expect(
      evaluateCodeRabbitFeedbackPoll({ ...pendingFeedback, ...feedback }, 99, 1, true),
    ).toStrictEqual({ type: 'verified', clean: false })
  })
})
