import { describe, expect, it } from 'vitest'
import { architectureReviewer, bugScanner, codeReviewer } from './__fixtures__/review-test-fixtures'
import { ReviewerStatus } from './reviewer-status'
import { ReviewerStatuses } from './reviewer-statuses'

describe('ReviewerStatuses', () => {
  it('parses a record of reviewer to status', () => {
    const statuses = ReviewerStatuses.parse({ 'code-review': 'APPROVED', 'bug-scanner': 'PENDING' })

    expect(statuses.statusFor(codeReviewer)?.name()).toBe('APPROVED')
    expect(statuses.statusFor(bugScanner)?.name()).toBe('PENDING')
    expect(statuses.statusFor(architectureReviewer)).toBeUndefined()
  })

  it('starts every reviewer at the same status', () => {
    const statuses = ReviewerStatuses.fromInitialState(
      [architectureReviewer, codeReviewer, bugScanner],
      ReviewerStatus.parse('PENDING'),
    )

    expect(statuses.toJSON()).toStrictEqual({
      'architecture-review': 'PENDING',
      'code-review': 'PENDING',
      'bug-scanner': 'PENDING',
    })
  })

  it('adds a reviewer that has no status yet', () => {
    const statuses = ReviewerStatuses.fromInitialState(
      [codeReviewer],
      ReviewerStatus.parse('PENDING'),
    ).withReviewer(bugScanner, ReviewerStatus.parse('OPEN_FEEDBACK'))

    expect(statuses.statusFor(bugScanner)?.name()).toBe('OPEN_FEEDBACK')
  })

  it('replaces one reviewer status and keeps the rest', () => {
    const statuses = ReviewerStatuses.fromInitialState(
      [architectureReviewer, codeReviewer],
      ReviewerStatus.parse('PENDING'),
    ).withReviewer(codeReviewer, ReviewerStatus.parse('APPROVED'))

    expect(statuses.statusFor(codeReviewer)?.name()).toBe('APPROVED')
    expect(statuses.statusFor(architectureReviewer)?.name()).toBe('PENDING')
  })
})
