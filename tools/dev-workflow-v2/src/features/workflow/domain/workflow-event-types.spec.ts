import { getKnownWorkflowEventTypes } from './workflow-events'

describe('getKnownWorkflowEventTypes', () => {
  it('returns the expected workflow event discriminators', () => {
    expect(getKnownWorkflowEventTypes()).toStrictEqual([
      'session-started',
      'transitioned',
      'issue-recorded',
      'branch-recorded',
      'pr-recorded',
      'ci-completed',
      'feedback-checked',
      'feedback-addressed',
      'task-check-passed',
      'review-recorded',
      'bash-checked',
      'write-checked',
    ])
  })
})
