import {
  WorkflowState,
  createWorkflowStateSchema,
  getInitialWorkflowState,
  getWorkflowStateNames,
} from './workflow-types'

const REVIEWERS = {
  'architecture-review': 'PENDING',
  'code-review': 'PENDING',
  'bug-scanner': 'PENDING',
  'task-check': 'PENDING',
  coderabbit: 'PENDING',
} as const

describe('WorkflowState', () => {
  it('starts with all named reviewers pending', () => {
    expect(getInitialWorkflowState()).toMatchObject({
      currentStateMachineState: 'IMPLEMENTING',
      reviewerStatuses: REVIEWERS,
    })
  })

  it('requires reviewer statuses when parsing persisted state', () => {
    expect(() => WorkflowState.parse({ currentStateMachineState: 'IMPLEMENTING' })).toThrow(
      'Required',
    )
  })

  it('replays reviewer status records', () => {
    expect(
      WorkflowState.replay([
        {
          type: 'reviewer-status-recorded',
          at: '2026-01-01T00:00:00Z',
          reviewer: 'code-review',
          status: 'APPROVED',
        },
      ]),
    ).toMatchObject({ reviewerStatuses: { ...REVIEWERS, 'code-review': 'APPROVED' } })
  })

  it('uses the configured state names for state schemas', () => {
    const schema = createWorkflowStateSchema(['ONE', 'TWO'])
    expect(
      schema.parse({ currentStateMachineState: 'ONE', reviewerStatuses: REVIEWERS }),
    ).toMatchObject({
      currentStateMachineState: 'ONE',
    })
  })

  it('preserves optional state fields and ignores non state events', () => {
    const state = WorkflowState.parse({
      currentStateMachineState: 'IMPLEMENTING',
      reviewerStatuses: REVIEWERS,
      githubIssue: 42,
      featureBranch: 'issue-42',
      prNumber: 1,
      prUrl: 'https://example.test/pr/1',
      preBlockedState: 'REVIEWING',
      transcriptPath: '/workspace/transcript',
    })
    expect(
      state.apply({
        type: 'bash-checked',
        at: '2026-01-01T00:00:00Z',
        tool: 'bash',
        command: 'git status',
        allowed: true,
      }),
    ).toBe(state)
    expect(getWorkflowStateNames()).toContain('HUMAN_REVIEWING')
  })
})
