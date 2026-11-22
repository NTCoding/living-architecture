import { describe, expect, it } from 'vitest'
import { InconsistentReviewVerdict, ReviewVerdict } from './review-verdict'
import { ReviewerStatus } from './reviewer-status'
import { codeReviewer, reviewFinding } from './__fixtures__/review-test-fixtures'

describe('ReviewVerdict', () => {
  it('carries the reviewer, the status and the findings', () => {
    const verdict = ReviewVerdict.from(codeReviewer, ReviewerStatus.parse('OPEN_FEEDBACK'), [
      reviewFinding(),
    ])

    expect(verdict.reviewer().name()).toBe('code-review')
    expect(verdict.status().name()).toBe('OPEN_FEEDBACK')
    expect(verdict.findings()).toHaveLength(1)
  })

  it('parses a verdict from model output', () => {
    const verdict = ReviewVerdict.parse({
      reviewer: 'code-review',
      status: 'OPEN_FEEDBACK',
      findings: [{ file: 'src/order.ts', line: 3, rule: null, summary: 'A vague name.' }],
    })

    expect(verdict.findings()[0]?.file()).toBe('src/order.ts')
    expect(verdict.findings()[0]?.reviewer().name()).toBe('code-review')
  })

  it('rejects a pending verdict', () => {
    expect(() => ReviewVerdict.from(codeReviewer, ReviewerStatus.parse('PENDING'), [])).toThrow(
      InconsistentReviewVerdict,
    )
  })

  it('rejects an approving verdict that carries findings', () => {
    expect(() =>
      ReviewVerdict.from(codeReviewer, ReviewerStatus.parse('APPROVED'), [reviewFinding()]),
    ).toThrow('An approving verdict cannot carry findings.')
  })

  it('rejects open feedback without a finding', () => {
    expect(() =>
      ReviewVerdict.from(codeReviewer, ReviewerStatus.parse('OPEN_FEEDBACK'), []),
    ).toThrow('A verdict with open feedback needs at least one finding.')
  })
})
