import { describe, expect, it } from 'vitest'
import { AggregateReviewOutcome } from './aggregate-review-outcome'

describe('AggregateReviewOutcome', () => {
  it('parses each known outcome name', () => {
    expect(AggregateReviewOutcome.fromName('PENDING').name()).toBe('PENDING')
    expect(AggregateReviewOutcome.fromName('OPEN_FEEDBACK').name()).toBe('OPEN_FEEDBACK')
    expect(AggregateReviewOutcome.fromName('APPROVED').name()).toBe('APPROVED')
  })

  it('rejects an unknown outcome name', () => {
    expect(() => AggregateReviewOutcome.fromName('UNKNOWN')).toThrow('Invalid enum value')
  })

  it('reports PENDING only for the pending outcome', () => {
    expect(AggregateReviewOutcome.fromName('PENDING').isPending()).toBe(true)
    expect(AggregateReviewOutcome.fromName('OPEN_FEEDBACK').isPending()).toBe(false)
  })

  it('reports open feedback only for the open feedback outcome', () => {
    expect(AggregateReviewOutcome.fromName('OPEN_FEEDBACK').isOpenFeedback()).toBe(true)
    expect(AggregateReviewOutcome.fromName('APPROVED').isOpenFeedback()).toBe(false)
  })

  it('reports approved only for the approved outcome', () => {
    expect(AggregateReviewOutcome.fromName('APPROVED').isApproved()).toBe(true)
    expect(AggregateReviewOutcome.fromName('PENDING').isApproved()).toBe(false)
  })
})
