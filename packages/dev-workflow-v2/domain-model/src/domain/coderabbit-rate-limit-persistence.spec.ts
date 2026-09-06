import { expect, it, vi } from 'vitest'
import { rateLimitEvidence } from './__fixtures__/coderabbit-rate-limit-evidence'
import {
  eventsToAddressingFeedback,
  eventsToAwaitingPrFeedback,
  makeDeps,
  rehydrateTestWorkflow,
  spec,
} from './__fixtures__/workflow-test-fixtures'
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
  reviewDecision: null,
  coderabbitReviewSeen: false,
  unresolvedCount: 0,
  threads: [],
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

it('preserves the skip after restart and a new head, even when the next review is pending', () => {
  const outcome = spec
    .given(...eventsToAddressingFeedback(), recordedEvidence, {
      type: 'pr-recorded',
      at,
      prNumber: 99,
      pullRequestSnapshot: snapshot,
    })
    .withDeps({ getPrFeedback: () => pendingFeedback })
    .when((workflow) => workflow.verifyFeedbackAddressed())
  expect(outcome.result).toStrictEqual({ pass: true })
  expect(outcome.state.currentStateMachineState).toBe('REFLECTING')
  expect(outcome.state.coderabbitRateLimitEvidence).toStrictEqual(rateLimitEvidence)
})

it('uses persisted evidence when automatic feedback polling resumes', () => {
  const state = WorkflowState.replay([
    ...eventsToAwaitingPrFeedback().slice(0, -1),
    recordedEvidence,
  ])
  const getPrFeedback = vi.fn(() => pendingFeedback)
  const workflow = rehydrateTestWorkflow(state, makeDeps({ getPrFeedback }))
  workflow.appendEvent({
    type: 'transitioned',
    at,
    from: 'AWAITING_CI',
    to: 'AWAITING_PR_FEEDBACK',
  })
  expect(workflow.getState().currentStateMachineState).toBe('REFLECTING')
  expect(getPrFeedback).toHaveBeenCalledWith(99, { includeCodeRabbitStatus: false })
  expect(workflow.getState().coderabbitRateLimitEvidence).toStrictEqual(rateLimitEvidence)
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
    state.apply({ type: 'pr-recorded', at, prNumber: 99, pullRequestSnapshot: snapshot })
      .coderabbitRateLimitEvidence,
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
])('rejects feedback evidence for another PR before queuing any event: %j', (evidence) => {
  const state = WorkflowState.replay([
    ...eventsToAddressingFeedback(),
    { type: 'pr-recorded', at, prNumber: 99, pullRequestSnapshot: snapshot },
  ])
  const workflow = rehydrateTestWorkflow(
    state,
    makeDeps({
      getPrFeedback: () => ({ ...pendingFeedback, coderabbitRateLimitEvidence: evidence }),
    }),
  )
  expect(() => workflow.verifyFeedbackAddressed()).toThrow('does not match the recorded PR')
  expect(workflow.getPendingEvents()).toStrictEqual([])
  expect(workflow.getState()).toStrictEqual(state)
})

it('accepts evidence for the recorded repository', () => {
  const state = WorkflowState.replay([
    ...eventsToAddressingFeedback(),
    { type: 'pr-recorded', at, prNumber: 99, pullRequestSnapshot: snapshot },
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
