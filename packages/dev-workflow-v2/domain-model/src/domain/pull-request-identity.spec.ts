import { describe, expect, it } from 'vitest'
import { parseWorkflowEvent } from './workflow-events'
import { WorkflowState } from './workflow-types'

const SNAPSHOT = {
  repository: 'example/repo',
  issue: 42,
  branch: 'issue-42',
  prNumber: 99,
  prUrl: 'https://github.com/example/repo/pull/99',
  baseRevision: 'a'.repeat(40),
  headRevision: 'b'.repeat(40),
}
const IDENTITY_MISMATCH = 'PR identity does not match the recorded pull request snapshot.'

const stateBase = {
  currentStateMachineState: 'REVIEWING',
  architectureReviewPassed: false,
  codeReviewPassed: false,
  bugScannerPassed: false,
  taskCheckPassed: false,
  ciPassed: false,
  feedbackClean: false,
  feedbackAddressed: false,
  prNumber: 99,
  prUrl: SNAPSHOT.prUrl,
}

describe('WorkflowState.parse — pull request identity', () => {
  it('accepts a state whose outer identity matches the snapshot', () => {
    expect(WorkflowState.parse({ ...stateBase, pullRequestSnapshot: SNAPSHOT }).prNumber).toBe(99)
  })

  it('accepts a state without a snapshot', () => {
    expect(WorkflowState.parse(stateBase).prNumber).toBe(99)
  })

  it('rejects a snapshot recorded for another pull request number', () => {
    expect(() =>
      WorkflowState.parse({
        ...stateBase,
        pullRequestSnapshot: { ...SNAPSHOT, prNumber: 100 },
      }),
    ).toThrow(IDENTITY_MISMATCH)
  })

  it('rejects a snapshot recorded for another pull request URL', () => {
    expect(() =>
      WorkflowState.parse({
        ...stateBase,
        pullRequestSnapshot: { ...SNAPSHOT, prUrl: 'https://github.com/example/repo/pull/100' },
      }),
    ).toThrow(IDENTITY_MISMATCH)
  })

  it('rejects a snapshot without an outer PR URL', () => {
    expect(() =>
      WorkflowState.parse({
        ...stateBase,
        prUrl: undefined,
        pullRequestSnapshot: SNAPSHOT,
      }),
    ).toThrow(IDENTITY_MISMATCH)
  })
})

describe('parseWorkflowEvent — pr-recorded pull request identity', () => {
  it('accepts an event whose outer identity matches the snapshot', () => {
    const result = parseWorkflowEvent({
      type: 'pr-recorded',
      at: '2026-01-01T00:00:00Z',
      prNumber: 99,
      prUrl: SNAPSHOT.prUrl,
      pullRequestSnapshot: SNAPSHOT,
    })
    expect(result.type).toStrictEqual('pr-recorded')
  })

  it('rejects an event carrying a snapshot for another pull request number', () => {
    expect(() =>
      parseWorkflowEvent({
        type: 'pr-recorded',
        at: '2026-01-01T00:00:00Z',
        prNumber: 99,
        prUrl: SNAPSHOT.prUrl,
        pullRequestSnapshot: { ...SNAPSHOT, prNumber: 100 },
      }),
    ).toThrow(IDENTITY_MISMATCH)
  })

  it('rejects an event carrying a snapshot for another pull request URL', () => {
    expect(() =>
      parseWorkflowEvent({
        type: 'pr-recorded',
        at: '2026-01-01T00:00:00Z',
        prNumber: 99,
        prUrl: SNAPSHOT.prUrl,
        pullRequestSnapshot: { ...SNAPSHOT, prUrl: 'https://github.com/example/repo/pull/100' },
      }),
    ).toThrow(IDENTITY_MISMATCH)
  })
})
