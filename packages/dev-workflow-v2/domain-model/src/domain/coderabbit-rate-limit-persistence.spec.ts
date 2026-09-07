import { expect, it, vi } from 'vitest'
import { rateLimitEvidence } from './__fixtures__/coderabbit-rate-limit-evidence'
import {
  eventsToAddressingFeedback,
  eventsToReviewing,
  makeDeps,
  rehydrateTestWorkflow,
} from './__fixtures__/workflow-test-fixtures'
import type { MaintainerWorkflow } from './workflow'
import { parseWorkflowEvent } from './workflow-events'
import { WorkflowState } from './workflow-types'

const at = '2026-09-06T10:00:00Z'
const snapshot = {
  repository: 'example/repo',
  issue: 42,
  branch: 'issue-42',
  prNumber: 99,
  prUrl: 'https://github.com/example/repo/pull/99',
  baseRevision: 'b'.repeat(40),
  headRevision: 'c'.repeat(40),
}
const recordedEvidence = parseWorkflowEvent({
  type: 'feedback-checked',
  at,
  clean: false,
  coderabbitRateLimitEvidence: rateLimitEvidence,
})
const pendingFeedback = {
  repository: snapshot.repository,
  headRevision: snapshot.headRevision,
  reviewDecision: null,
  coderabbitReviewSeen: false,
  unresolvedCount: 0,
  threads: [],
}

function recordSatisfiedReviewers(workflow: MaintainerWorkflow): void {
  for (const reviewType of [
    'architecture-review',
    'code-review',
    'bug-scanner',
    'task-check',
  ] as const) {
    workflow.appendEvent({
      type: 'reviewer-satisfaction-recorded',
      at,
      repository: snapshot.repository,
      prNumber: snapshot.prNumber,
      completion: {
        reviewType,
        verdict: 'PASS',
        reviewId: 1,
        headRevision: snapshot.headRevision,
      },
    })
  }
}

it('replays immutable rate-limit evidence without claiming that the review completed', () => {
  const state = WorkflowState.replay([...eventsToAddressingFeedback(), recordedEvidence])
  expect(state.coderabbitRateLimitEvidence).toStrictEqual(rateLimitEvidence)
  expect(Object.isFrozen(state.coderabbitRateLimitEvidence)).toBe(true)
  expect(state).toMatchObject({ feedbackClean: false, coderabbitSkipReason: 'SKIPPED_RATE_LIMIT' })
  expect(
    WorkflowState.parse(JSON.parse(JSON.stringify(state))).coderabbitRateLimitEvidence,
  ).toStrictEqual(rateLimitEvidence)
})

it('preserves the skip at the review gate on a later pending head', () => {
  const workflow = rehydrateTestWorkflow(
    WorkflowState.replay(eventsToReviewing()),
    makeDeps({
      getPrFeedback: () => pendingFeedback,
      getRequiredPullRequestChecks: () => ({
        headRevision: snapshot.headRevision,
        checks: [{ name: 'main', status: 'passed', detailsUrl: null }],
      }),
    }),
  )
  workflow.appendEvent({
    type: 'pr-recorded',
    at,
    prNumber: 99,
    prUrl: snapshot.prUrl,
    pullRequestSnapshot: snapshot,
  })
  workflow.appendEvent(recordedEvidence)
  recordSatisfiedReviewers(workflow)

  const result = workflow.verifyPrReviewGate()

  expect(result).toStrictEqual({ pass: true })
  expect(workflow.getState().currentStateMachineState).toBe('REFLECTING')
  expect(workflow.getState().coderabbitRateLimitEvidence).toStrictEqual(rateLimitEvidence)
})

it('uses persisted evidence to skip CodeRabbit status checks at the review gate', () => {
  const getPrFeedback = vi.fn(() => pendingFeedback)
  const workflow = rehydrateTestWorkflow(
    WorkflowState.replay(eventsToReviewing()),
    makeDeps({
      getPrFeedback,
      getRequiredPullRequestChecks: () => ({
        headRevision: snapshot.headRevision,
        checks: [{ name: 'main', status: 'passed', detailsUrl: null }],
      }),
    }),
  )
  workflow.appendEvent({
    type: 'pr-recorded',
    at,
    prNumber: 99,
    prUrl: snapshot.prUrl,
    pullRequestSnapshot: snapshot,
  })
  workflow.appendEvent(recordedEvidence)
  recordSatisfiedReviewers(workflow)

  const result = workflow.verifyPrReviewGate()

  expect(result).toStrictEqual({ pass: true })
  expect(getPrFeedback).toHaveBeenCalledWith(99, { includeCodeRabbitStatus: false })
  expect(workflow.getState().currentStateMachineState).toBe('REFLECTING')
})

it('does not discard demonstrated rate limiting when the same legacy PR is recorded again', () => {
  const state = WorkflowState.replay([...eventsToAddressingFeedback(), recordedEvidence])
  expect(
    state.apply({ type: 'pr-recorded', at, prNumber: 99 }).coderabbitRateLimitEvidence,
  ).toStrictEqual(rateLimitEvidence)
})

it('does not invent a skip when legacy PR metadata is upgraded', () => {
  const state = WorkflowState.replay(eventsToAddressingFeedback())
  expect(
    state.apply({
      type: 'pr-recorded',
      at,
      prNumber: 99,
      prUrl: snapshot.prUrl,
      pullRequestSnapshot: snapshot,
    }).coderabbitRateLimitEvidence,
  ).toBeUndefined()
})

it('clears the skip when the PR number changes', () => {
  const state = WorkflowState.replay([...eventsToAddressingFeedback(), recordedEvidence])
  expect(
    state.apply({ type: 'pr-recorded', at, prNumber: 100 }).coderabbitRateLimitEvidence,
  ).toBeUndefined()
})

it('clears the skip when the same PR number belongs to a different repository', () => {
  const state = WorkflowState.replay([...eventsToAddressingFeedback(), recordedEvidence])
  expect(
    state.apply({
      type: 'pr-recorded',
      at,
      prNumber: 99,
      prUrl: 'https://github.com/example/other/pull/99',
      pullRequestSnapshot: {
        ...snapshot,
        repository: 'example/other',
        prUrl: 'https://github.com/example/other/pull/99',
      },
    }).coderabbitRateLimitEvidence,
  ).toBeUndefined()
})

it.each([
  { ...rateLimitEvidence, prNumber: 100 },
  { ...rateLimitEvidence, repository: 'example/other' },
])('fails the review gate closed when feedback evidence belongs to another PR: %j', (evidence) => {
  const state = WorkflowState.replay([
    ...eventsToReviewing(),
    { type: 'pr-recorded', at, prNumber: 99, prUrl: snapshot.prUrl, pullRequestSnapshot: snapshot },
  ])
  const workflow = rehydrateTestWorkflow(
    state,
    makeDeps({
      getPrFeedback: () => ({ ...pendingFeedback, coderabbitRateLimitEvidence: evidence }),
      getRequiredPullRequestChecks: () => ({
        headRevision: snapshot.headRevision,
        checks: [{ name: 'main', status: 'passed', detailsUrl: null }],
      }),
    }),
  )
  recordSatisfiedReviewers(workflow)

  const result = workflow.verifyPrReviewGate()

  expect(result).toMatchObject({ pass: false })
  expect(workflow.getState().currentStateMachineState).toBe('BLOCKED')
  expect(workflow.getPendingEvents().at(-1)).toMatchObject({ type: 'transitioned', to: 'BLOCKED' })
})

it('accepts evidence for the recorded repository', () => {
  const state = WorkflowState.replay([
    ...eventsToAddressingFeedback(),
    { type: 'pr-recorded', at, prNumber: 99, prUrl: snapshot.prUrl, pullRequestSnapshot: snapshot },
    recordedEvidence,
  ])
  expect(state.coderabbitRateLimitEvidence).toStrictEqual(rateLimitEvidence)
})

it('rejects incomplete persisted evidence', () => {
  expect(() =>
    parseWorkflowEvent({
      type: 'feedback-checked',
      at,
      clean: false,
      coderabbitRateLimitEvidence: { ...rateLimitEvidence, headRevision: undefined },
    }),
  ).toThrow('headRevision')
})

it('keeps the original demonstrated skip when rate limiting is observed again on a later head', () => {
  const state = WorkflowState.replay([...eventsToAddressingFeedback(), recordedEvidence])
  const updated = state.apply({
    type: 'feedback-checked',
    at,
    clean: false,
    coderabbitRateLimitEvidence: {
      ...rateLimitEvidence,
      headRevision: 'd'.repeat(40),
      statusId: 456,
    },
  })
  expect(updated.coderabbitRateLimitEvidence).toStrictEqual(rateLimitEvidence)
})
