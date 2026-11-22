import { describe, expect, it } from 'vitest'
import { InvalidReviewCycle, ReviewCycle } from './review-cycle'
import { ReviewCycleLimit } from './review-cycle-limit'
import { ReviewerStatuses } from './reviewer-statuses'
import { ReviewVerdict } from './review-verdict'
import { ReviewerStatus } from './reviewer-status'
import {
  architectureReviewer,
  bugScanner,
  codeReviewer,
  reviewFinding,
} from './__fixtures__/review-test-fixtures'

function cycleWith(statuses: Record<string, string>, cycleNumber = 1): ReviewCycle {
  return ReviewCycle.start({ cycleNumber, statuses: ReviewerStatuses.parse(statuses) })
}

const allPending = {
  'architecture-review': 'PENDING',
  'code-review': 'PENDING',
  'bug-scanner': 'PENDING',
}

describe('ReviewCycle', () => {
  it('reports the statuses it carries, with the verdicts folded in', () => {
    const cycle = cycleWith(allPending).recordVerdict(
      ReviewVerdict.parse({
        reviewer: 'code-review',
        status: 'OPEN_FEEDBACK',
        findings: [
          { file: 'src/order.ts', line: 12, rule: 'SD-005', summary: 'A decision sits here.' },
        ],
      }),
    )

    expect(cycle.statuses().toJSON()).toStrictEqual({
      'architecture-review': 'PENDING',
      'code-review': 'OPEN_FEEDBACK',
      'bug-scanner': 'PENDING',
    })
  })

  it('runs every reviewer in the first cycle', () => {
    const plan = cycleWith(allPending).reviewersToRun()

    expect(plan.included().map((reviewer) => reviewer.name())).toStrictEqual([
      'architecture-review',
      'code-review',
      'bug-scanner',
    ])
    expect(plan.excluded()).toStrictEqual([])
  })

  it('leaves out a reviewer that already approved, as the previous workflow does', () => {
    const plan = cycleWith({ ...allPending, 'code-review': 'APPROVED' }).reviewersToRun()

    expect(plan.included().map((reviewer) => reviewer.name())).toStrictEqual([
      'architecture-review',
      'bug-scanner',
    ])
    expect(plan.excluded().map((reviewer) => reviewer.name())).toStrictEqual(['code-review'])
  })

  it('records a verdict and reports the new status', () => {
    const cycle = cycleWith(allPending).recordVerdict(
      ReviewVerdict.from(codeReviewer, ReviewerStatus.parse('OPEN_FEEDBACK'), [reviewFinding()]),
    )

    expect(cycle.statusFor(codeReviewer)?.name()).toBe('OPEN_FEEDBACK')
    expect(cycle.cycleNumber()).toBe(1)
  })

  it('refuses a verdict from a reviewer that already approved', () => {
    const cycle = cycleWith({ ...allPending, 'code-review': 'APPROVED' })

    expect(() =>
      cycle.recordVerdict(ReviewVerdict.from(codeReviewer, ReviewerStatus.parse('APPROVED'), [])),
    ).toThrow('already approved')
  })

  it('records a verdict from a reviewer that has no status yet', () => {
    const cycle = ReviewCycle.start({
      cycleNumber: 1,
      statuses: ReviewerStatuses.parse({ 'code-review': 'PENDING', 'bug-scanner': 'PENDING' }),
    })

    const recorded = cycle.recordVerdict(
      ReviewVerdict.from(architectureReviewer, ReviewerStatus.parse('APPROVED'), []),
    )

    expect(recorded.statusFor(architectureReviewer)?.name()).toBe('APPROVED')
  })

  it('counts the next cycle from the current one', () => {
    expect(cycleWith(allPending, 2).beginNextCycle().cycleNumber()).toBe(3)
  })

  it('applies the standard limit of three cycles', () => {
    expect(cycleWith(allPending, 2).isLimitReached()).toBe(false)
    expect(cycleWith(allPending, 3).isLimitReached()).toBe(true)
  })

  it('accepts a different limit', () => {
    const cycle = ReviewCycle.start({
      cycleNumber: 2,
      statuses: ReviewerStatuses.parse(allPending),
      limit: ReviewCycleLimit.parse(5),
    })

    expect(cycle.isLimitReached()).toBe(false)
  })

  it('rejects a cycle number that is not a positive integer', () => {
    expect(() => cycleWith(allPending, 0)).toThrow(InvalidReviewCycle)
    expect(() => cycleWith(allPending, 1.5)).toThrow(InvalidReviewCycle)
  })

  it('says a reviewer that has no status yet has none', () => {
    const cycle = ReviewCycle.start({
      cycleNumber: 1,
      statuses: ReviewerStatuses.parse({ 'code-review': 'PENDING', 'bug-scanner': 'PENDING' }),
    })

    expect(cycle.statusFor(architectureReviewer)).toBeUndefined()
    expect(cycle.statusFor(bugScanner)?.name()).toBe('PENDING')
  })
})
