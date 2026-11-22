import { describe, expect, it } from 'vitest'
import { InvalidReviewerStatus, ReviewerStatus } from './reviewer-status'

describe('ReviewerStatus', () => {
  it('parses the four status names', () => {
    expect(
      ['PENDING', 'RATE_LIMITED', 'OPEN_FEEDBACK', 'APPROVED'].map((name) =>
        ReviewerStatus.parse(name).name(),
      ),
    ).toStrictEqual(['PENDING', 'RATE_LIMITED', 'OPEN_FEEDBACK', 'APPROVED'])
  })

  it('rejects an unknown status name', () => {
    expect(() => ReviewerStatus.parse('REQUESTED_CHANGES')).toThrow(InvalidReviewerStatus)
  })

  it('reports pending only for a pending status', () => {
    expect(ReviewerStatus.parse('PENDING').isPending()).toBe(true)
    expect(ReviewerStatus.parse('APPROVED').isPending()).toBe(false)
  })

  it('reports open feedback only for an open feedback status', () => {
    expect(ReviewerStatus.parse('OPEN_FEEDBACK').isOpenFeedback()).toBe(true)
    expect(ReviewerStatus.parse('APPROVED').isOpenFeedback()).toBe(false)
  })

  it('treats a rate limited reviewer as approved, so the cycle can close', () => {
    expect(ReviewerStatus.parse('RATE_LIMITED').isApproved()).toBe(true)
    expect(ReviewerStatus.parse('APPROVED').isApproved()).toBe(true)
    expect(ReviewerStatus.parse('OPEN_FEEDBACK').isApproved()).toBe(false)
  })
})
