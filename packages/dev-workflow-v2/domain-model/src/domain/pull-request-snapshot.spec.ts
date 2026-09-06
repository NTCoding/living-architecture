import { expect, it } from 'vitest'
import { parseWorkflowEvent } from './workflow-events'
import { WorkflowState } from './workflow-types'

const snapshot = {
  repository: 'example/repo',
  issue: 42,
  branch: 'issue-42',
  prNumber: 99,
  prUrl: 'https://github.com/example/repo/pull/99',
  baseRevision: 'a'.repeat(40),
  headRevision: 'b'.repeat(40),
}

it('retains the complete immutable snapshot when a persisted PR event is replayed', () => {
  const event = parseWorkflowEvent({
    type: 'pr-recorded',
    at: '2026-09-06T10:00:00Z',
    prNumber: snapshot.prNumber,
    prUrl: snapshot.prUrl,
    pullRequestSnapshot: snapshot,
  })
  const state = WorkflowState.replay([event])
  expect(state.pullRequestSnapshot).toStrictEqual(snapshot)
  expect(Object.isFrozen(state.pullRequestSnapshot)).toBe(true)
})

it('keeps legacy PR events readable without inventing revision evidence', () => {
  const event = parseWorkflowEvent({
    type: 'pr-recorded',
    at: '2026-01-01T00:00:00Z',
    prNumber: 99,
  })
  const state = WorkflowState.replay([event])
  expect(state.prNumber).toBe(99)
  expect(state.pullRequestSnapshot).toBeUndefined()
})

it('clears an earlier snapshot when a legacy recording replaces the PR', () => {
  const state = WorkflowState.parse({
    ...WorkflowState.initial(),
    prNumber: snapshot.prNumber,
    prUrl: snapshot.prUrl,
    pullRequestSnapshot: snapshot,
  })
  const updated = state.apply({ type: 'pr-recorded', at: '2026-09-06T10:00:00Z', prNumber: 100 })
  expect(updated.prNumber).toBe(100)
  expect(updated.pullRequestSnapshot).toBeUndefined()
})

it('rejects a partially populated persisted snapshot', () => {
  expect(() =>
    parseWorkflowEvent({
      type: 'pr-recorded',
      at: '2026-09-06T10:00:00Z',
      prNumber: snapshot.prNumber,
      pullRequestSnapshot: { ...snapshot, baseRevision: undefined },
    }),
  ).toThrow('baseRevision')
})
