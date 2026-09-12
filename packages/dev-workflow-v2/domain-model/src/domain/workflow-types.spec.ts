import {
  WorkflowState,
  createWorkflowStateSchema,
  getInitialWorkflowState,
  getWorkflowStateNames,
} from './workflow-types'
import {
  BashChecked,
  ReviewCycleClosed,
  ReviewCycleStarted,
  ReviewerStatusRecorded,
} from './workflow-events'

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
    })
    expect(getInitialWorkflowState().reviewerStatuses.toJSON()).toStrictEqual(REVIEWERS)
  })

  it('requires reviewer statuses when parsing persisted state', () => {
    expect(() => WorkflowState.parse({ currentStateMachineState: 'IMPLEMENTING' })).toThrow(
      'Required',
    )
  })

  it('requires exactly the known reviewer roster', () => {
    expect(() =>
      WorkflowState.parse({
        currentStateMachineState: 'IMPLEMENTING',
        reviewerStatuses: {},
      }),
    ).toThrow('reviewerStatuses')
    expect(() =>
      WorkflowState.parse({
        currentStateMachineState: 'IMPLEMENTING',
        reviewerStatuses: { ...REVIEWERS, unknown: 'PENDING' },
      }),
    ).toThrow('Unrecognized key')
    expect(
      WorkflowState.parse({
        currentStateMachineState: 'IMPLEMENTING',
        reviewerStatuses: REVIEWERS,
      }).reviewerStatuses.toJSON(),
    ).toStrictEqual(REVIEWERS)
  })

  it('replays reviewer status records', () => {
    expect(
      WorkflowState.from([
        ReviewerStatusRecorded.parse({
          type: 'reviewer-status-recorded',
          at: '2026-01-01T00:00:00Z',
          reviewer: 'code-review',
          status: 'APPROVED',
        }),
      ]).reviewerStatuses.toJSON(),
    ).toStrictEqual({ ...REVIEWERS, 'code-review': 'APPROVED' })
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
    expect(state.toJSON()).toMatchObject({
      preBlockedState: 'REVIEWING',
      transcriptPath: '/workspace/transcript',
    })
    expect(
      state.apply(
        BashChecked.parse({
          type: 'bash-checked',
          at: '2026-01-01T00:00:00Z',
          tool: 'bash',
          command: 'git status',
          allowed: true,
        }),
      ),
    ).toBe(state)
    expect(getWorkflowStateNames()).toContain('HUMAN_REVIEWING')
  })

  it('opens a review cycle from a cycle-started event', () => {
    const state = WorkflowState.from([
      ReviewCycleStarted.parse({
        type: 'review-cycle-started',
        at: '2026-01-01T00:00:00Z',
        cycleNumber: 2,
        included: ['code-review'],
        excluded: { 'task-check': 'already-approved' },
      }),
    ])

    expect(state.reviewCycleNumber).toBe(2)
    expect(state.reviewCycleOpen).toBe(true)
    expect(state.includedReviewers).toStrictEqual(['code-review'])
    expect(state.excludedReviewers).toStrictEqual({ 'task-check': 'already-approved' })
  })

  it('closes a review cycle and records its outcomes', () => {
    const state = WorkflowState.from([
      ReviewCycleClosed.parse({
        type: 'review-cycle-closed',
        at: '2026-01-01T00:00:00Z',
        cycleNumber: 1,
        outcomes: { 'code-review': 'APPROVED', 'task-check': 'OPEN_FEEDBACK' },
      }),
    ])

    expect(state.reviewCycleOpen).toBe(false)
    expect(state.reviewerStatuses.toJSON()['code-review']).toBe('APPROVED')
    expect(state.reviewerStatuses.toJSON()['task-check']).toBe('OPEN_FEEDBACK')
  })
})
