import { getKnownWorkflowEventTypes } from './workflow-events'

describe('getKnownWorkflowEventTypes', () => {
  it('returns the expected workflow event discriminators', () => {
    expect(getKnownWorkflowEventTypes()).toStrictEqual([
      'session-started',
      'transitioned',
      'issue-recorded',
      'branch-recorded',
      'pr-recorded',
      'reviewer-status-recorded',
      'bash-checked',
      'write-checked',
    ])
  })
})
