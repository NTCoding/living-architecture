import { WorkflowState } from './workflow-types'
import type { WorkflowEvent } from './workflow-events'
import { ReviewerSatisfaction } from './reviewer-satisfaction'
import { buildTestWorkflow, makeDeps } from './__fixtures__/workflow-test-fixtures'

const snapshot = {
  repository: 'example/repo',
  issue: 42,
  branch: 'issue-42',
  prNumber: 99,
  prUrl: 'https://github.com/example/repo/pull/99',
  baseRevision: 'a'.repeat(40),
  headRevision: 'b'.repeat(40),
}
const recorded: WorkflowEvent = {
  type: 'pr-recorded',
  at: '2026-01-01T00:00:00Z',
  prNumber: 99,
  prUrl: snapshot.prUrl,
  pullRequestSnapshot: snapshot,
}
const satisfied: Extract<WorkflowEvent, { type: 'reviewer-satisfaction-recorded' }> = {
  type: 'reviewer-satisfaction-recorded',
  at: recorded.at,
  repository: snapshot.repository,
  prNumber: 99,
  completion: {
    reviewType: 'architecture-review',
    verdict: 'PASS',
    reviewId: 1,
    headRevision: snapshot.headRevision,
  },
}

it('retains a satisfied reviewer when the same PR advances to a later head', () => {
  const state = WorkflowState.replay([
    recorded,
    satisfied,
    { ...recorded, pullRequestSnapshot: { ...snapshot, headRevision: 'c'.repeat(40) } },
  ])
  expect(
    ReviewerSatisfaction.parse(state.reviewerSatisfaction).reviewersNeedingReview(),
  ).toStrictEqual(['code-review', 'bug-scanner', 'task-check'])
  expect(state.reviewerSatisfaction['architecture-review']).toStrictEqual({
    status: 'satisfied',
    reviewId: 1,
    headRevision: snapshot.headRevision,
  })
})

it.each([
  { ...recorded, prNumber: 100, pullRequestSnapshot: { ...snapshot, prNumber: 100 } },
  { ...recorded, pullRequestSnapshot: { ...snapshot, repository: 'other/repo' } },
  { type: 'pr-recorded', at: recorded.at, prNumber: 99 },
] satisfies WorkflowEvent[])(
  'resets satisfaction when the recorded PR identity is replaced: %j',
  (replacement) => {
    expect(
      ReviewerSatisfaction.parse(
        WorkflowState.replay([recorded, satisfied, replacement]).reviewerSatisfaction,
      ).reviewersNeedingReview(),
    ).toStrictEqual(ReviewerSatisfaction.requiredReviewers())
  },
)

it.each([
  { ...satisfied, repository: 'other/repo' },
  { ...satisfied, prNumber: 100 },
  { ...satisfied, completion: { ...satisfied.completion, headRevision: 'c'.repeat(40) } },
])('rejects mismatched satisfaction before publishing an event: %j', (event) => {
  const workflow = buildTestWorkflow(makeDeps(), WorkflowState.replay([recorded]))
  expect(() => workflow.appendEvent(event)).toThrow('Reviewer satisfaction does not match')
  expect(workflow.getPendingEvents()).toStrictEqual([])
})

it('rejects satisfaction without a complete PR record', () => {
  expect(() => WorkflowState.initial().apply(satisfied)).toThrow(
    'Reviewer satisfaction does not match',
  )
})

it('does not invent satisfaction from legacy manual review records', () => {
  const state = WorkflowState.replay([
    recorded,
    {
      type: 'review-recorded',
      at: recorded.at,
      reviewId: 1,
      reviewType: 'architecture-review',
      verdict: 'PASS',
    },
  ])
  expect(
    ReviewerSatisfaction.parse(state.reviewerSatisfaction).reviewersNeedingReview(),
  ).toStrictEqual(ReviewerSatisfaction.requiredReviewers())
})
