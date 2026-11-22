import { describe, expect, it } from 'vitest'
import { PullRequestFeedback } from './pull-request-feedback'
import { reviewFinding } from './__fixtures__/review-test-fixtures'

describe('PullRequestFeedback', () => {
  it('reports a review that has arrived with findings', () => {
    const feedback = PullRequestFeedback.from({
      reviewSeen: true,
      rateLimited: false,
      findings: [reviewFinding()],
    })

    expect(feedback.hasReview()).toBe(true)
    expect(feedback.isSettled()).toBe(true)
    expect(feedback.hasOpenFeedback()).toBe(true)
    expect(feedback.findings()).toHaveLength(1)
  })

  it('reports a rate limited reviewer as settled without a review', () => {
    const feedback = PullRequestFeedback.from({
      reviewSeen: false,
      rateLimited: true,
      findings: [],
    })

    expect(feedback.hasReview()).toBe(false)
    expect(feedback.isRateLimited()).toBe(true)
    expect(feedback.isSettled()).toBe(true)
    expect(feedback.hasOpenFeedback()).toBe(false)
  })

  it('reports that nothing has arrived yet', () => {
    const feedback = PullRequestFeedback.from({
      reviewSeen: false,
      rateLimited: false,
      findings: [],
    })

    expect(feedback.isSettled()).toBe(false)
  })
})
