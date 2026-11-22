import { describe, expect, it } from 'vitest'
import { AggregatedReviewResults } from './aggregated-review-results'
import { ReviewVerdict } from './review-verdict'
import { ReviewerStatus } from './reviewer-status'
import {
  architectureReviewer,
  bugScanner,
  codeReviewer,
  reviewFinding,
} from './__fixtures__/review-test-fixtures'

describe('AggregatedReviewResults', () => {
  it('is approved when every verdict approved', () => {
    const results = AggregatedReviewResults.from([
      ReviewVerdict.from(architectureReviewer, ReviewerStatus.parse('APPROVED'), []),
      ReviewVerdict.from(codeReviewer, ReviewerStatus.parse('APPROVED'), []),
    ])

    expect(results.isApproved()).toBe(true)
    expect(results.hasOpenFeedback()).toBe(false)
    expect(results.findings()).toStrictEqual([])
  })

  it('has open feedback when one verdict carries a finding', () => {
    const results = AggregatedReviewResults.from([
      ReviewVerdict.from(architectureReviewer, ReviewerStatus.parse('APPROVED'), []),
      ReviewVerdict.from(codeReviewer, ReviewerStatus.parse('OPEN_FEEDBACK'), [reviewFinding()]),
      ReviewVerdict.from(bugScanner, ReviewerStatus.parse('APPROVED'), []),
    ])

    expect(results.hasOpenFeedback()).toBe(true)
    expect(results.isApproved()).toBe(false)
    expect(results.findings()).toHaveLength(1)
  })
})
