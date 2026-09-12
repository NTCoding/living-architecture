import { getKnownWorkflowEventTypes } from './workflow-events'

describe('getKnownWorkflowEventTypes', () => {
  it('returns the expected workflow event discriminators', () => {
    expect(getKnownWorkflowEventTypes()).toStrictEqual([
      'session-started',
      'transitioned',
      'issue-recorded',
      'branch-recorded',
      'pr-recorded',
      'review-cycle-started',
      'review-cycle-closed',
      'reviewer-status-recorded',
      'bash-checked',
      'write-checked',
    ])
  })
})
