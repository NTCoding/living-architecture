import { ReviewerSatisfaction } from './reviewer-satisfaction'
import { WorkflowState } from './workflow-types'
import { buildTestWorkflow, makeDeps } from './__fixtures__/workflow-test-fixtures'

const headRevision = 'b'.repeat(40)
const snapshot = {
  repository: 'example/repo',
  issue: 42,
  branch: 'issue-42',
  prNumber: 99,
  prUrl: 'https://github.com/example/repo/pull/99',
  baseRevision: 'a'.repeat(40),
  headRevision,
}
const reviewers = ReviewerSatisfaction.requiredReviewers()
  .reduce(
    (state, reviewType, index) =>
      state.recordCompletion({ reviewType, verdict: 'PASS', reviewId: index + 1, headRevision }),
    ReviewerSatisfaction.initial(),
  )
  .toJSON()
class TestInfrastructureError extends Error {}

const feedback = {
  repository: snapshot.repository,
  headRevision,
  reviewDecision: null,
  unresolvedCount: 0,
  coderabbitReviewSeen: true,
  coderabbitRateLimited: false,
  codeRabbitReview: {
    type: 'completed' as const,
    statusId: 1,
    evidenceUrl: 'https://api.github.com/status/1',
  },
  threads: [],
}
function workflow(overrides: Parameters<typeof makeDeps>[0] = {}) {
  return buildTestWorkflow(
    makeDeps({ getPrFeedback: () => feedback, ...overrides }),
    WorkflowState.initial().with({
      currentStateMachineState: 'REVIEWING',
      prNumber: snapshot.prNumber,
      prUrl: snapshot.prUrl,
      pullRequestSnapshot: snapshot,
      reviewerSatisfaction: reviewers,
    }),
  )
}

it('records observed feedback and enters REFLECTING only through the complete review gate', () => {
  const subject = workflow()
  expect(subject.verifyPrReviewGate()).toStrictEqual({ pass: true })
  expect(subject.getState().currentStateMachineState).toBe('REFLECTING')
  expect(subject.getPendingEvents().map((event) => event.type)).toStrictEqual([
    'feedback-checked',
    'transitioned',
  ])
})

it.each([
  {
    checks: [{ name: 'main', status: 'pending' as const, detailsUrl: null }],
    expected: 'REVIEWING',
  },
  {
    checks: [{ name: 'main', status: 'failed' as const, detailsUrl: null }],
    expected: 'ADDRESSING_FEEDBACK',
  },
])('holds or addresses checks: %j', ({ checks, expected }) => {
  const subject = workflow({ getRequiredPullRequestChecks: () => ({ headRevision, checks }) })
  const result = subject.verifyPrReviewGate()
  expect(subject.getState().currentStateMachineState).toBe(expected)
  expect(result.pass).toBe(expected === 'ADDRESSING_FEEDBACK')
})

it('blocks and persists the observed reason when GitHub feedback cannot be read', () => {
  const subject = workflow({
    getPrFeedback: () => {
      throw new TestInfrastructureError('credentials rejected')
    },
  })
  expect(subject.verifyPrReviewGate()).toMatchObject({ pass: false })
  expect(subject.getState().currentStateMachineState).toBe('BLOCKED')
  expect(subject.getState().prFeedbackVerificationFailedReason).toContain('credentials rejected')
})

it('blocks and persists the observed reason when required-check discovery fails', () => {
  const subject = workflow({
    getRequiredPullRequestChecks: () => {
      throw new TestInfrastructureError('malformed response')
    },
  })
  expect(subject.verifyPrReviewGate()).toMatchObject({ pass: false })
  expect(subject.getState().currentStateMachineState).toBe('BLOCKED')
  expect(subject.getState().prFeedbackVerificationFailedReason).toContain('malformed response')
})

it('uses durable PR-wide rate-limit evidence without treating it as a CodeRabbit pass', () => {
  const subject = workflow({
    getPrFeedback: () => ({ ...feedback, codeRabbitReview: { type: 'not-requested' } }),
  })
  subject.appendEvent({
    type: 'feedback-checked',
    at: '2026-01-01T00:00:00Z',
    clean: false,
    unresolvedCount: 0,
    coderabbitRateLimitEvidence: {
      repository: snapshot.repository,
      prNumber: snapshot.prNumber,
      headRevision: 'a'.repeat(40),
      statusId: 2,
      evidenceUrl: 'https://api.github.com/status/2',
    },
  })
  expect(subject.verifyPrReviewGate()).toStrictEqual({ pass: true })
  expect(subject.getState().currentStateMachineState).toBe('REFLECTING')
})

it('does not run without a recorded pull request snapshot', () => {
  const subject = buildTestWorkflow(
    makeDeps(),
    WorkflowState.initial().with({ currentStateMachineState: 'REVIEWING' }),
  )
  expect(subject.verifyPrReviewGate()).toStrictEqual({
    pass: false,
    reason: 'A complete PR snapshot is required before evaluating the review gate.',
  })
})

it('does not evaluate the gate from a state where the operation is unavailable', () => {
  const subject = buildTestWorkflow(makeDeps(), WorkflowState.initial())
  expect(subject.verifyPrReviewGate()).toMatchObject({ pass: false })
  expect(subject.getPendingEvents()).toStrictEqual([])
})

it('blocks an indeterminate CodeRabbit result after recording feedback evidence', () => {
  const subject = workflow({
    getPrFeedback: () => ({
      ...feedback,
      codeRabbitReview: { type: 'unsupported', reason: 'identity unavailable' },
    }),
  })
  expect(subject.verifyPrReviewGate()).toMatchObject({ pass: false })
  expect(subject.getState().currentStateMachineState).toBe('BLOCKED')
  expect(subject.getPendingEvents().map((event) => event.type)).toStrictEqual([
    'feedback-checked',
    'pr-feedback-verification-failed',
    'transitioned',
  ])
})
