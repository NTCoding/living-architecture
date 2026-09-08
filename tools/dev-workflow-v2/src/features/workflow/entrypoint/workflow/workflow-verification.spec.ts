import { vi, afterEach, expect, it } from 'vitest'
import { createStore } from '@nt-ai-lab/deterministic-agent-workflow-event-store'
import { flattenStoredEvent } from '@nt-ai-lab/deterministic-agent-workflow-engine'
import {
  buildTestContext,
  cleanupDb,
  progressToState,
  runCommand,
} from './__fixtures__/workflow-cli-test-fixtures'
import { CREATE_PR_COMMAND } from './__fixtures__/workflow-cli-state-steps-test-fixtures'
import {
  createSessionReviewRecordedEvent,
  listSessionReviewRecords,
} from '@living-architecture/dev-workflow-v2-use-cases/queries/session-review-records'

class LocalCheckFixtureError extends Error {
  constructor() {
    super('Required check exited with status 7')
    this.name = 'LocalCheckFixtureError'
  }
}
const databases: string[] = []
afterEach(() => {
  vi.restoreAllMocks()
  for (const database of databases) cleanupDb(database)
  databases.length = 0
})

it('persists local verification before recording a normal PR and entering REVIEWING', () => {
  const runLocalVerification = vi.fn()
  const context = buildTestContext({ runLocalVerification })
  databases.push(context.dbPath)
  const createPullRequest = vi.spyOn(context.workflowDeps, 'createPullRequest')
  progressToState(context, 'SUBMITTING_PR')
  const creation = runCommand(context, CREATE_PR_COMMAND)
  const reviewEntry = runCommand(context, ['transition', 'REVIEWING'])
  expect({
    verificationCalls: runLocalVerification.mock.calls.length,
    creationCalls: createPullRequest.mock.calls.length,
    creationExit: creation.exitCode,
    reviewExit: reviewEntry.exitCode,
  }).toStrictEqual({
    verificationCalls: 1,
    creationCalls: 1,
    creationExit: 0,
    reviewExit: 0,
  })
  const events = context.engineDeps.store.readEvents(context.sessionId).map(flattenStoredEvent)
  expect(
    events.flatMap((event) => {
      if (event.type === 'local-verification-completed') return ['verified']
      if (event.type === 'pr-recorded') return ['created']
      if (event.type === 'transitioned' && event.to === 'REVIEWING') return ['reviewing']
      return []
    }),
  ).toStrictEqual(['verified', 'created', 'reviewing'])
  expect(JSON.parse(runCommand(context, ['get-state']).output)).toMatchObject({
    currentStateMachineState: 'REVIEWING',
    localVerification: {
      status: 'passed',
      headCommit: 'b'.repeat(40),
    },
    pullRequestSnapshot: {
      repository: 'example/repo',
      prNumber: 123,
      headRevision: 'b'.repeat(40),
    },
  })
})

it('reopens the recorded verification failure in BLOCKED', () => {
  const runLocalVerification = vi.fn(() => {
    throw new LocalCheckFixtureError()
  })
  const context = buildTestContext({ runLocalVerification })
  databases.push(context.dbPath)
  progressToState(context, 'VERIFYING')
  const result = runCommand(context, ['verify-local'])
  expect(result.exitCode).toBe(2)
  expect(result.output).toContain('Required check exited with status 7')
  const reopened = {
    ...context,
    engineDeps: {
      ...context.engineDeps,
      store: createStore(context.dbPath),
    },
  }
  expect(JSON.parse(runCommand(reopened, ['get-state']).output)).toMatchObject({
    currentStateMachineState: 'BLOCKED',
    preBlockedState: 'VERIFYING',
    localVerification: {
      status: 'failed',
      reason:
        'Local verification failed: LocalCheckFixtureError: Required check exited with status 7',
    },
  })
  expect(runLocalVerification.mock.calls).toHaveLength(1)
})

it('does not enter REVIEWING before the verified PR is recorded', () => {
  const context = buildTestContext()
  databases.push(context.dbPath)
  const createPullRequest = vi.spyOn(context.workflowDeps, 'createPullRequest')
  progressToState(context, 'SUBMITTING_PR')
  expect(runCommand(context, ['transition', 'REVIEWING']).exitCode).toBe(2)
  expect(createPullRequest).not.toHaveBeenCalled()
  expect(JSON.parse(runCommand(context, ['get-state']).output)).toMatchObject({
    currentStateMachineState: 'SUBMITTING_PR',
  })
})

it('does not retry verification or create a PR while BLOCKED', () => {
  const runLocalVerification = vi.fn(() => {
    throw new LocalCheckFixtureError()
  })
  const context = buildTestContext({ runLocalVerification })
  databases.push(context.dbPath)
  const createPullRequest = vi.spyOn(context.workflowDeps, 'createPullRequest')
  progressToState(context, 'VERIFYING')
  runCommand(context, ['verify-local'])
  const reopened = {
    ...context,
    engineDeps: {
      ...context.engineDeps,
      store: createStore(context.dbPath),
    },
  }
  expect(runCommand(reopened, ['verify-local']).exitCode).toBe(2)
  expect(runCommand(reopened, CREATE_PR_COMMAND).exitCode).toBe(2)
  expect(runLocalVerification.mock.calls).toHaveLength(1)
  expect(createPullRequest).not.toHaveBeenCalled()
})

it('routes review-gate verification through the workflow-owned command', () => {
  const context = buildTestContext()
  databases.push(context.dbPath)
  progressToState(context, 'SUBMITTING_PR')
  runCommand(context, CREATE_PR_COMMAND)
  runCommand(context, ['transition', 'REVIEWING'])
  const result = runCommand(context, ['verify-pr-review-gate'])
  expect(result.exitCode).toBe(2)
  expect(JSON.parse(runCommand(context, ['get-state']).output)).toMatchObject({
    currentStateMachineState: 'BLOCKED',
  })
})

it('syncs reviewer satisfaction from platform reviews through the workflow-owned command', () => {
  const context = buildTestContext()
  databases.push(context.dbPath)
  progressToState(context, 'SUBMITTING_PR')
  runCommand(context, CREATE_PR_COMMAND)
  runCommand(context, ['transition', 'REVIEWING'])
  const listSessionReviews = vi.spyOn(context.workflowDeps, 'listSessionReviews')
  const reviewEvent = createSessionReviewRecordedEvent(
    {
      reviewId: 1,
      createdAt: '2024-01-01T00:00:00Z',
      reviewType: 'architecture-review',
      verdict: 'PASS',
      findings: [],
      pullRequestNumber: 123,
      completionProvenance: {
        bundleId: 'bundle',
        providerSessionId: 'provider-session',
        providerRunId: 'provider-run',
        baseRevision: 'a'.repeat(40),
        headRevision: 'b'.repeat(40),
        exactFilesDigest: 'c'.repeat(64),
        exactFiles: ['src/test.ts'],
        reviewerDefinitionVersion: 'v1',
      },
    },
    'REVIEWING',
  )
  listSessionReviews.mockReturnValue(listSessionReviewRecords([reviewEvent]))
  const result = runCommand(context, ['sync-reviewer-satisfaction'])
  expect(result.exitCode).toBe(0)
  expect(JSON.parse(runCommand(context, ['get-state']).output)).toMatchObject({
    currentStateMachineState: 'REVIEWING',
    reviewerSatisfaction: {
      'architecture-review': {
        status: 'satisfied',
        reviewId: 1,
        headRevision: 'b'.repeat(40),
      },
    },
  })
})
