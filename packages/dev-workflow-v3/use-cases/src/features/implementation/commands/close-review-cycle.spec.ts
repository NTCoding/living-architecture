import { describe, expect, it } from 'vitest'
import { CloseReviewCycle } from './close-review-cycle'
import { approvedVerdict, statuses } from './__fixtures__/command-test-fixtures'

describe('CloseReviewCycle', () => {
  it('leaves out the reviewer that approved and reports the limit', () => {
    const result = new CloseReviewCycle().execute({
      cycleNumber: 2,
      statuses,
      verdicts: [approvedVerdict],
    })

    expect(result.cycleNumber).toBe(2)
    expect(result.reviewersLeftOut).toStrictEqual(['architecture-review'])
    expect(result.reviewersToRun).toStrictEqual(['code-review', 'bug-scanner'])
    expect(result.limitReached).toBe(false)
  })

  it('reports the limit when the third cycle closes', () => {
    const result = new CloseReviewCycle().execute({
      cycleNumber: 3,
      statuses,
      verdicts: [],
    })

    expect(result.limitReached).toBe(true)
    expect(result.reviewersToRun).toStrictEqual([
      'architecture-review',
      'code-review',
      'bug-scanner',
    ])
  })

  it('rejects a verdict from a reviewer that already approved', () => {
    expect(() =>
      new CloseReviewCycle().execute({
        cycleNumber: 2,
        statuses: { ...statuses, 'architecture-review': 'APPROVED' },
        verdicts: [approvedVerdict],
      }),
    ).toThrow('already approved and is left out of later cycles')
  })

  it('rejects a verdict that approves and carries findings', () => {
    expect(() =>
      new CloseReviewCycle().execute({
        cycleNumber: 2,
        statuses,
        verdicts: [
          {
            reviewer: 'architecture-review',
            status: 'APPROVED',
            findings: [{ file: 'a.ts', line: 1, rule: null, summary: 'A problem.' }],
          },
        ],
      }),
    ).toThrow('An approving verdict cannot carry findings.')
  })
})
