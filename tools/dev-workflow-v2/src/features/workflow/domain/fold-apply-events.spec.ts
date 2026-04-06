import {
  applyEvents, EMPTY_STATE 
} from './fold'
import type { WorkflowEvent } from './workflow-events'

const AT = '2026-01-01T00:00:00Z'

describe('applyEvents', () => {
  it('returns EMPTY_STATE for empty event sequence', () => {
    expect(applyEvents([])).toStrictEqual(EMPTY_STATE)
  })

  it('reduces a full event sequence to correct state and transition', () => {
    const events: WorkflowEvent[] = [
      {
        type: 'session-started',
        at: AT,
      },
      {
        type: 'issue-recorded',
        at: AT,
        issueNumber: 10,
      },
      {
        type: 'branch-recorded',
        at: AT,
        branch: 'feature/foo',
      },
      {
        type: 'transitioned',
        at: AT,
        from: 'IMPLEMENTING',
        to: 'REVIEWING',
      },
      {
        type: 'architecture-review-completed',
        at: AT,
        passed: true,
      },
      {
        type: 'code-review-completed',
        at: AT,
        passed: true,
      },
      {
        type: 'bug-scanner-completed',
        at: AT,
        passed: true,
      },
      {
        type: 'transitioned',
        at: AT,
        from: 'REVIEWING',
        to: 'SUBMITTING_PR',
      },
    ]
    const state = applyEvents(events)
    expect(state.currentStateMachineState).toStrictEqual('SUBMITTING_PR')
    expect(state.githubIssue).toStrictEqual(10)
    expect(state.featureBranch).toStrictEqual('feature/foo')
  })

  it('reduces a full event sequence preserving all review verdicts', () => {
    const events: WorkflowEvent[] = [
      {
        type: 'architecture-review-completed',
        at: AT,
        passed: true,
      },
      {
        type: 'code-review-completed',
        at: AT,
        passed: true,
      },
      {
        type: 'bug-scanner-completed',
        at: AT,
        passed: true,
      },
    ]
    const state = applyEvents(events)
    expect(state.architectureReviewPassed).toStrictEqual(true)
    expect(state.codeReviewPassed).toStrictEqual(true)
    expect(state.bugScannerPassed).toStrictEqual(true)
  })

  it('handles BLOCKED/unblock round trip correctly', () => {
    const events: WorkflowEvent[] = [
      {
        type: 'transitioned',
        at: AT,
        from: 'IMPLEMENTING',
        to: 'BLOCKED',
      },
      {
        type: 'transitioned',
        at: AT,
        from: 'BLOCKED',
        to: 'IMPLEMENTING',
      },
    ]
    const state = applyEvents(events)
    expect(state.currentStateMachineState).toStrictEqual('IMPLEMENTING')
    expect(state.preBlockedState).toBeUndefined()
  })

  it('preserves preBlockedState in BLOCKED state', () => {
    const events: WorkflowEvent[] = [
      {
        type: 'transitioned',
        at: AT,
        from: 'REVIEWING',
        to: 'BLOCKED',
      },
    ]
    const state = applyEvents(events)
    expect(state.preBlockedState).toStrictEqual('REVIEWING')
  })
})
