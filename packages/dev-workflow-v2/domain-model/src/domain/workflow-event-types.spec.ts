import { getKnownWorkflowEventTypes } from './workflow-events'

describe('getKnownWorkflowEventTypes', () => {
  it('returns the expected workflow event discriminators', () => {
    expect(getKnownWorkflowEventTypes()).toStrictEqual([
      'session-started',
      'local-verification-completed',
      'reviewer-satisfaction-recorded',
      'transitioned',
      'issue-recorded',
      'branch-recorded',
      'pr-recorded',
      'ci-completed',
      'feedback-checked',
      'feedback-addressed',
      'pr-feedback-verification-failed',
      'task-check-passed',
      'review-recorded',
      'bash-checked',
      'write-checked',
    ])
  })
})
