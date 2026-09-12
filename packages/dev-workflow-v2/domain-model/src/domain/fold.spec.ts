import { getInitialWorkflowState } from './workflow-types'
import {
  BranchRecorded,
  IssueRecorded,
  PrRecorded,
  ReviewerStatusRecorded,
  Transitioned,
} from './workflow-events'

const AT = '2026-01-01T00:00:00Z'

describe('WorkflowState.apply', () => {
  it('records the issue, branch, and pull request', () => {
    const state = getInitialWorkflowState()
      .apply(IssueRecorded.parse({ type: 'issue-recorded', at: AT, issueNumber: 42 }))
      .apply(BranchRecorded.parse({ type: 'branch-recorded', at: AT, branch: 'issue-42' }))
      .apply(
        PrRecorded.parse({
          type: 'pr-recorded',
          at: AT,
          prNumber: 7,
          prUrl: 'https://example.test/pr/7',
        }),
      )

    expect(state).toMatchObject({
      githubIssue: 42,
      featureBranch: 'issue-42',
      prNumber: 7,
      prUrl: 'https://example.test/pr/7',
    })
  })

  it('updates only the named reviewer status', () => {
    const state = getInitialWorkflowState().apply(
      ReviewerStatusRecorded.parse({
        type: 'reviewer-status-recorded',
        at: AT,
        reviewer: 'bug-scanner',
        status: 'OPEN_FEEDBACK',
      }),
    )

    expect(state.reviewerStatuses.toJSON()).toMatchObject({
      'bug-scanner': 'OPEN_FEEDBACK',
      'code-review': 'PENDING',
    })
  })

  it('transitions state without treating review feedback as workflow state', () => {
    const state = getInitialWorkflowState().apply(
      Transitioned.parse({
        type: 'transitioned',
        at: AT,
        from: 'REVIEWING',
        to: 'ADDRESSING_FEEDBACK',
      }),
    )

    expect(state.currentStateMachineState).toBe('ADDRESSING_FEEDBACK')
  })

  it('records the state before a blocked transition', () => {
    const state = getInitialWorkflowState().apply(
      Transitioned.parse({
        type: 'transitioned',
        at: AT,
        from: 'REVIEWING',
        to: 'BLOCKED',
      }),
    )

    expect(state.preBlockedState).toBe('REVIEWING')
  })
})
