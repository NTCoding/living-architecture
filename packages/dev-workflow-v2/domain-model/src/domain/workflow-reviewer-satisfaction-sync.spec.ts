import { WorkflowState } from './workflow-types'
import { buildTestWorkflow, makeDeps } from './__fixtures__/workflow-test-fixtures'
import { ReviewRecord } from './review-record'

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

function storedReview(overrides: Record<string, unknown> = {}): ReviewRecord {
  return ReviewRecord.parse({
    reviewId: 1,
    createdAt: '2026-01-01T00:00:00Z',
    reviewType: 'architecture-review',
    verdict: 'PASS',
    findings: [],
    pullRequestNumber: snapshot.prNumber,
    completionProvenance: {
      bundleId: 'bundle',
      providerSessionId: 'provider-session',
      providerRunId: 'provider-run',
      baseRevision: snapshot.baseRevision,
      headRevision,
      exactFilesDigest: 'c'.repeat(64),
      exactFiles: ['file.ts'],
      reviewerDefinitionVersion: 'v1',
    },
    ...overrides,
  })
}

function workflow(overrides: Parameters<typeof makeDeps>[0] = {}) {
  return buildTestWorkflow(
    makeDeps({ ...overrides }),
    WorkflowState.initial().with({
      currentStateMachineState: 'REVIEWING',
      prNumber: snapshot.prNumber,
      prUrl: snapshot.prUrl,
      pullRequestSnapshot: snapshot,
    }),
  )
}

it('syncs reviewer completions from the event store into reviewer satisfaction', () => {
  const subject = workflow({
    listSessionReviews: () => [
      storedReview({
        reviewId: 1,
        reviewType: 'architecture-review',
        verdict: 'PASS',
      }),
      storedReview({
        reviewId: 2,
        reviewType: 'code-review',
        verdict: 'FAIL',
      }),
      storedReview({
        reviewId: 3,
        reviewType: 'bug-scanner',
        verdict: 'PASS',
      }),
      storedReview({
        reviewId: 4,
        reviewType: 'task-check',
        verdict: 'PASS',
      }),
    ],
  })

  expect(subject.syncReviewerSatisfaction()).toStrictEqual({ pass: true })
  expect(subject.getState().reviewerSatisfaction).toStrictEqual({
    'architecture-review': {
      status: 'satisfied',
      reviewId: 1,
      headRevision,
    },
    'code-review': {
      status: 'unsatisfied',
      reviewId: 2,
      headRevision,
    },
    'bug-scanner': {
      status: 'satisfied',
      reviewId: 3,
      headRevision,
    },
    'task-check': {
      status: 'satisfied',
      reviewId: 4,
      headRevision,
    },
  })
})

it('ignores reviews for a different pull request', () => {
  const subject = workflow({
    listSessionReviews: () => [storedReview({ pullRequestNumber: 100 })],
  })

  expect(subject.syncReviewerSatisfaction()).toMatchObject({ pass: false })
  expect(subject.getState().reviewerSatisfaction).toStrictEqual({
    'architecture-review': { status: 'not-run' },
    'code-review': { status: 'not-run' },
    'bug-scanner': { status: 'not-run' },
    'task-check': { status: 'not-run' },
  })
})

it('ignores reviews for a different head revision', () => {
  const subject = workflow({
    listSessionReviews: () => [
      storedReview({
        completionProvenance: {
          ...storedReview().completionProvenance,
          headRevision: 'c'.repeat(40),
        },
      }),
    ],
  })

  expect(subject.syncReviewerSatisfaction()).toMatchObject({ pass: false })
  expect(subject.getState().reviewerSatisfaction).toStrictEqual({
    'architecture-review': { status: 'not-run' },
    'code-review': { status: 'not-run' },
    'bug-scanner': { status: 'not-run' },
    'task-check': { status: 'not-run' },
  })
})

it('ignores unknown review types', () => {
  const subject = workflow({
    listSessionReviews: () => [storedReview({ reviewType: 'unknown-reviewer' })],
  })

  expect(subject.syncReviewerSatisfaction()).toMatchObject({ pass: false })
  expect(subject.getState().reviewerSatisfaction).toStrictEqual({
    'architecture-review': { status: 'not-run' },
    'code-review': { status: 'not-run' },
    'bug-scanner': { status: 'not-run' },
    'task-check': { status: 'not-run' },
  })
})

it('is idempotent and does not re-emit events for already-synced reviewers', () => {
  const subject = workflow({
    listSessionReviews: () => [
      storedReview({
        reviewId: 1,
        reviewType: 'architecture-review',
        verdict: 'PASS',
      }),
      storedReview({
        reviewId: 2,
        reviewType: 'code-review',
        verdict: 'PASS',
      }),
    ],
  })

  expect(subject.syncReviewerSatisfaction()).toStrictEqual({ pass: true })
  expect(subject.getState().reviewerSatisfaction).toStrictEqual({
    'architecture-review': {
      status: 'satisfied',
      reviewId: 1,
      headRevision,
    },
    'code-review': {
      status: 'satisfied',
      reviewId: 2,
      headRevision,
    },
    'bug-scanner': { status: 'not-run' },
    'task-check': { status: 'not-run' },
  })

  const pendingEventsAfterFirstSync = subject.getPendingEvents().length
  expect(subject.syncReviewerSatisfaction()).toMatchObject({ pass: false })
  expect(subject.getPendingEvents()).toHaveLength(pendingEventsAfterFirstSync)
})

it('does not sync without a recorded pull request snapshot', () => {
  const subject = buildTestWorkflow(
    makeDeps(),
    WorkflowState.initial().with({ currentStateMachineState: 'REVIEWING' }),
  )
  expect(subject.syncReviewerSatisfaction()).toStrictEqual({
    pass: false,
    reason: 'A complete PR snapshot is required before syncing reviewer satisfaction.',
  })
})

it('does not sync from a state where the operation is unavailable', () => {
  const subject = buildTestWorkflow(makeDeps(), WorkflowState.initial())
  expect(subject.syncReviewerSatisfaction()).toMatchObject({ pass: false })
  expect(subject.getPendingEvents()).toStrictEqual([])
})
