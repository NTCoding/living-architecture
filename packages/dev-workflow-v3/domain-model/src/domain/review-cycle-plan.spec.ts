import { describe, expect, it } from 'vitest'
import { ReviewCyclePlan } from './review-cycle-plan'
import { architectureReviewer, bugScanner, codeReviewer } from './__fixtures__/review-test-fixtures'

describe('ReviewCyclePlan', () => {
  it('holds the reviewers to run and the reviewers left out', () => {
    const plan = ReviewCyclePlan.from([codeReviewer], [architectureReviewer])

    expect(plan.included().map((reviewer) => reviewer.name())).toStrictEqual(['code-review'])
    expect(plan.excluded().map((reviewer) => reviewer.name())).toStrictEqual([
      'architecture-review',
    ])
    expect(plan.isEmpty()).toBe(false)
  })

  it('is empty when every reviewer already approved', () => {
    expect(
      ReviewCyclePlan.from([], [architectureReviewer, codeReviewer, bugScanner]).isEmpty(),
    ).toBe(true)
  })
})
