import { ReviewerSatisfaction } from './reviewer-satisfaction'

const headRevision = 'a'.repeat(40)
const completion = { reviewType: 'architecture-review', reviewId: 1, headRevision, verdict: 'PASS' }

it('requires all four independent reviewers on the first review', () => {
  const reviewers = ReviewerSatisfaction.initial()
  expect(reviewers.reviewersNeedingReview()).toStrictEqual([
    'architecture-review',
    'code-review',
    'bug-scanner',
    'task-check',
  ])
  expect(reviewers.allSatisfied()).toBe(false)
})

it('continues an unsatisfied reviewer on a later head', () => {
  const reviewers = ReviewerSatisfaction.initial().recordCompletion({
    ...completion,
    verdict: 'FAIL',
  })
  expect(reviewers.reviewersNeedingReview()).toContain('architecture-review')
  expect(
    reviewers
      .recordCompletion({ ...completion, reviewId: 2, headRevision: 'b'.repeat(40) })
      .toJSON()['architecture-review'],
  ).toStrictEqual({ status: 'satisfied', reviewId: 2, headRevision: 'b'.repeat(40) })
})

it('retains the first satisfaction receipt across later heads and verdicts', () => {
  const first = ReviewerSatisfaction.initial().recordCompletion(completion)
  const later = first.recordCompletion({
    ...completion,
    verdict: 'FAIL',
    reviewId: 2,
    headRevision: 'b'.repeat(40),
  })
  expect(later.toJSON()['architecture-review']).toStrictEqual({
    status: 'satisfied',
    reviewId: 1,
    headRevision,
  })
  expect(later.reviewersNeedingReview()).toStrictEqual(['code-review', 'bug-scanner', 'task-check'])
})

it('reconstructs satisfaction without re-invoking satisfied reviewers', () => {
  const first = ReviewerSatisfaction.initial().recordCompletion(completion)
  expect(
    ReviewerSatisfaction.parse(JSON.parse(JSON.stringify(first))).reviewersNeedingReview(),
  ).toStrictEqual(['code-review', 'bug-scanner', 'task-check'])
})

it('satisfies the reviewer gate only after all four reviewers are satisfied', () => {
  const reviewers = ReviewerSatisfaction.requiredReviewers().reduce(
    (state, reviewType, index) =>
      state.recordCompletion({ ...completion, reviewType, reviewId: index + 1 }),
    ReviewerSatisfaction.initial(),
  )
  expect(reviewers.allSatisfied()).toBe(true)
  expect(reviewers.reviewersNeedingReview()).toStrictEqual([])
})

it('rejects unconfigured reviewer identities', () => {
  expect(() =>
    ReviewerSatisfaction.initial().recordCompletion({ ...completion, reviewType: 'main-agent' }),
  ).toThrow('Invalid enum value')
  expect(() => ReviewerSatisfaction.reviewerNameSchema().parse('main-agent')).toThrow(
    'Invalid enum value',
  )
})

it('preserves immutable snapshots without sharing writable receipts', () => {
  const snapshot = ReviewerSatisfaction.snapshotSchema().parse(
    ReviewerSatisfaction.initial().recordCompletion(completion).toJSON(),
  )
  expect(Object.isFrozen(snapshot)).toBe(true)
  expect(Object.isFrozen(snapshot['architecture-review'])).toBe(true)
})
