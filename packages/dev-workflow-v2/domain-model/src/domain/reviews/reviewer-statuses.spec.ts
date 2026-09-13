import { Reviewer } from './reviewers'
import { ReviewerStatus } from './statuses'
import { ReviewerStatuses } from './reviewer-statuses'

const REVIEWERS = [
  'architecture-review',
  'code-review',
  'bug-scanner',
  'task-check',
  'coderabbit',
] as const

class InvalidTestReviewerStatusError extends Error {}

function status(name: string): ReviewerStatus {
  const result = ReviewerStatus.fromName(name)
  if (!result.ok) throw new InvalidTestReviewerStatusError(result.reason)
  return result.value
}

describe('ReviewerStatuses', () => {
  it('parses a wire record into reviewer statuses', () => {
    const statuses = ReviewerStatuses.parse({ 'code-review': 'OPEN_FEEDBACK' })

    expect(statuses.statusFor(Reviewer.fromName('code-review'))?.name()).toBe('OPEN_FEEDBACK')
  })

  it('rejects an unknown reviewer status when parsing a record', () => {
    expect(() => ReviewerStatuses.parse({ 'code-review': 'DONE' })).toThrow(
      'Unknown reviewer status',
    )
  })

  it('builds the initial state for every reviewer', () => {
    const statuses = ReviewerStatuses.fromInitialState(
      REVIEWERS.map((reviewer) => Reviewer.fromName(reviewer)),
      status('PENDING'),
    )

    expect([...statuses.statusByReviewer().values()].map((entry) => entry.name())).toStrictEqual([
      'PENDING',
      'PENDING',
      'PENDING',
      'PENDING',
      'PENDING',
    ])
    expect(statuses.toJSON()).toStrictEqual({
      'architecture-review': 'PENDING',
      'code-review': 'PENDING',
      'bug-scanner': 'PENDING',
      'task-check': 'PENDING',
      coderabbit: 'PENDING',
    })
  })

  it('replaces one reviewer status without mutating the original', () => {
    const statuses = ReviewerStatuses.parse({ 'code-review': 'PENDING', 'bug-scanner': 'PENDING' })

    const updated = statuses.withReviewer(Reviewer.fromName('code-review'), status('APPROVED'))

    expect(updated.statusFor(Reviewer.fromName('code-review'))?.name()).toBe('APPROVED')
    expect(updated.statusFor(Reviewer.fromName('bug-scanner'))?.name()).toBe('PENDING')
    expect(statuses.statusFor(Reviewer.fromName('code-review'))?.name()).toBe('PENDING')
  })

  it('returns undefined for a reviewer that is not present', () => {
    const statuses = ReviewerStatuses.parse({ 'code-review': 'PENDING' })

    expect(statuses.statusFor(Reviewer.fromName('bug-scanner'))).toBeUndefined()
  })
})
