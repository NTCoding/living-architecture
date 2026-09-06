import { ReviewerSatisfaction } from './reviewer-satisfaction'
import { PullRequestReviewGate } from './pull-request-review-gate'

const headRevision = 'a'.repeat(40)
const snapshot = {
  repository: 'example/repo',
  issue: 42,
  branch: 'issue-42',
  prNumber: 99,
  prUrl: 'https://github.com/example/repo/pull/99',
  baseRevision: 'b'.repeat(40),
  headRevision,
}
const reviewers = ReviewerSatisfaction.requiredReviewers()
  .reduce(
    (state, reviewType, index) =>
      state.recordCompletion({ reviewType, verdict: 'PASS', reviewId: index + 1, headRevision }),
    ReviewerSatisfaction.initial(),
  )
  .toJSON()
const check = { name: 'main', status: 'passed', detailsUrl: null }
const complete = { type: 'completed', statusId: 1, evidenceUrl: 'https://api.github.com/status/1' }
const feedback = {
  repository: snapshot.repository,
  headRevision,
  reviewDecision: null,
  unresolvedCount: 0,
  codeRabbitReview: complete,
}
const gate = { snapshot, reviewers, checks: { headRevision, checks: [check] }, feedback }
const skip = {
  repository: snapshot.repository,
  prNumber: 99,
  headRevision: 'b'.repeat(40),
  statusId: 1,
  evidenceUrl: 'https://api.github.com/status/1',
}

it('reflects only when checks, four independent reviewers and current-head CodeRabbit evidence agree', () => {
  expect(PullRequestReviewGate.parse(gate).assess()).toStrictEqual({
    status: 'reflecting',
    codeRabbit: 'completed',
  })
})

it.each(['repository', 'headRevision'] as const)('rejects feedback from another %s', (field) => {
  expect(
    PullRequestReviewGate.parse({ ...gate, feedback: { ...feedback, [field]: 'other' } }).assess(),
  ).toMatchObject({ status: 'blocked' })
})

it('rejects missing feedback provenance despite legacy completion flags', () => {
  expect(
    PullRequestReviewGate.parse({
      ...gate,
      feedback: {
        ...feedback,
        repository: undefined,
        headRevision: undefined,
        coderabbitReviewSeen: true,
      },
    }).assess(),
  ).toMatchObject({ status: 'blocked' })
})

it.each(['pending', 'failed', 'indeterminate'] as const)(
  'keeps check outcome %s distinct',
  (status) => {
    const expected = {
      pending: 'reviewing',
      failed: 'addressing-feedback',
      indeterminate: 'blocked',
    }
    expect(
      PullRequestReviewGate.parse({
        ...gate,
        checks: { ...gate.checks, checks: [{ ...check, status }] },
      }).assess(),
    ).toMatchObject({ status: expected[status] })
  },
)

it('never accepts checks from an earlier head', () => {
  expect(
    PullRequestReviewGate.parse({
      ...gate,
      checks: { ...gate.checks, headRevision: 'b'.repeat(40) },
    }).assess(),
  ).toMatchObject({ status: 'blocked' })
})

it('waits for each reviewer independently of CI and CodeRabbit', () => {
  expect(
    PullRequestReviewGate.parse({
      ...gate,
      reviewers: ReviewerSatisfaction.initial().toJSON(),
    }).assess(),
  ).toMatchObject({ status: 'reviewing' })
})

it('does not equate pending CodeRabbit with an empty successful review', () => {
  expect(
    PullRequestReviewGate.parse({
      ...gate,
      feedback: { ...feedback, codeRabbitReview: { type: 'pending' } },
    }).assess(),
  ).toMatchObject({ status: 'reviewing' })
})

it.each([
  undefined,
  { type: 'not-requested' },
  { type: 'unsupported', reason: 'Unverified identity' },
  { ...complete, type: 'failed' },
  { ...complete, type: 'rate-limited' },
])('blocks absent or unverifiable CodeRabbit completion: %j', (codeRabbitReview) => {
  expect(
    PullRequestReviewGate.parse({ ...gate, feedback: { ...feedback, codeRabbitReview } }).assess(),
  ).toMatchObject({ status: 'blocked' })
})

it('preserves a prior-head PR-wide skip without calling it a pass', () => {
  expect(
    PullRequestReviewGate.parse({
      ...gate,
      skippedCodeRabbit: skip,
      feedback: { ...feedback, codeRabbitReview: { type: 'not-requested' } },
    }).assess(),
  ).toStrictEqual({ status: 'reflecting', codeRabbit: 'SKIPPED_RATE_LIMIT' })
})

it.each([
  { ...skip, repository: 'other/repo' },
  { ...skip, prNumber: 100 },
])('rejects another PR’s skip: %j', (skippedCodeRabbit) => {
  expect(PullRequestReviewGate.parse({ ...gate, skippedCodeRabbit }).assess()).toMatchObject({
    status: 'blocked',
  })
})

it.each([
  { ...feedback, unresolvedCount: 1 },
  { ...feedback, reviewDecision: 'CHANGES_REQUESTED' },
])('never lets a rate-limit skip waive outstanding feedback: %j', (outstanding) => {
  expect(
    PullRequestReviewGate.parse({
      ...gate,
      skippedCodeRabbit: skip,
      feedback: outstanding,
    }).assess(),
  ).toMatchObject({ status: 'addressing-feedback' })
})

it('rejects an empty required-check set', () => {
  expect(() =>
    PullRequestReviewGate.parse({ ...gate, checks: { headRevision, checks: [] } }),
  ).toThrow('Array must contain at least 1 element(s)')
})
