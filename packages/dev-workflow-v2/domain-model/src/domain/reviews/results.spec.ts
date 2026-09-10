import { describe, expect, it } from 'vitest'
import { Reviewer } from './reviewers'
import { AggregatedReviewResults, ReviewOutcome } from './results'
import { ReviewerStatus } from './statuses'

function reviewerStatus(value: string): ReviewerStatus {
  const result = ReviewerStatus.fromName(value)
  if (result.ok) return result.value
  throw new InvalidTestReviewerStatus(result.reason)
}

class InvalidTestReviewerStatus extends Error {}

describe('review results', () => {
  it('keeps a reviewer together with its status', () => {
    const reviewer = Reviewer.fromName('code-review')
    const status = reviewerStatus('OPEN_FEEDBACK')

    const outcome = ReviewOutcome.from(reviewer, status)

    expect(outcome.reviewer()).toBe(reviewer)
    expect(outcome.status()).toBe(status)
  })

  it('aggregates open feedback ahead of pending results', () => {
    const reviewer = Reviewer.fromName('code-review')
    const results = AggregatedReviewResults.from([
      ReviewOutcome.from(reviewer, reviewerStatus('PENDING')),
      ReviewOutcome.from(reviewer, reviewerStatus('OPEN_FEEDBACK')),
    ])

    expect(results.hasOpenFeedback()).toBe(true)
    expect(results.isPending()).toBe(true)
    expect(results.isApproved()).toBe(false)
  })

  it('recognises a fully approved result set', () => {
    const results = AggregatedReviewResults.from([
      ReviewOutcome.from(Reviewer.fromName('code-review'), reviewerStatus('APPROVED')),
    ])

    expect(results.hasOpenFeedback()).toBe(false)
    expect(results.isPending()).toBe(false)
    expect(results.isApproved()).toBe(true)
  })

  it('parses and rejects reviewer statuses without exceptions', () => {
    expect(reviewerStatus('PENDING').name()).toBe('PENDING')
    expect(ReviewerStatus.fromName('PENDING')).toMatchObject({ ok: true })
    expect(ReviewerStatus.fromName('INVALID')).toStrictEqual({
      ok: false,
      reason: 'Unknown reviewer status: INVALID',
    })
  })
})
