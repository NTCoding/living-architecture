import { WorkflowState } from '../workflow-types'
import type { WorkflowEvent } from '../workflow-events'
import { ReviewingState } from './reviewing'
import { SubmittingPrState } from './submitting-pr'
import type { ReadWorkflowPullRequestFeedback } from '../ports/read-pull-request-feedback'

const AT = '2026-01-01T00:00:00Z'
type PullRequestFeedback = ReturnType<ReadWorkflowPullRequestFeedback>

function githubFeedback(overrides: Partial<PullRequestFeedback> = {}): PullRequestFeedback {
  return {
    reviewDecision: null,
    coderabbitReviewSeen: false,
    unresolvedCount: 0,
    threads: [],
    ...overrides,
  }
}

function codeRabbitThread(login: string): PullRequestFeedback['threads'][number] {
  return {
    id: 'thread-1',
    isResolved: false,
    isOutdated: false,
    path: 'src/example.ts',
    line: 1,
    comments: [{ author: { login }, body: 'review feedback' }],
  }
}

function reviewerStatuses(overrides: Partial<WorkflowState['reviewerStatuses']> = {}) {
  return {
    'architecture-review': 'PENDING',
    'code-review': 'PENDING',
    'bug-scanner': 'PENDING',
    'task-check': 'PENDING',
    coderabbit: 'PENDING',
    ...overrides,
  } satisfies WorkflowState['reviewerStatuses']
}

function stateContext(
  state: WorkflowState,
  feedback: PullRequestFeedback = githubFeedback(),
  createPullRequest = () => ({ prNumber: 9, prUrl: 'https://example.test/pr/9', isDraft: false }),
) {
  const events: unknown[] = []
  const stateBox = { value: state }
  return {
    events,
    context: {
      workflow: {
        getState: () => stateBox.value,
        appendEvent: (event: WorkflowEvent) => {
          events.push(event)
          stateBox.value = stateBox.value.apply(event)
        },
        recordReviewerStatus: (
          reviewer: keyof WorkflowState['reviewerStatuses'],
          status: WorkflowState['reviewerStatuses'][string],
        ) => {
          events.push({ reviewer, status })
          stateBox.value = stateBox.value.with({
            reviewerStatuses: { ...stateBox.value.reviewerStatuses, [reviewer]: status },
          })
          return { pass: true }
        },
      },
      deps: {
        getPrFeedback: () => feedback,
        sleepMs: () => undefined,
        createPullRequest,
        now: () => AT,
        emitEvent: (event: WorkflowEvent) => {
          events.push(event)
          stateBox.value = stateBox.value.apply(event)
        },
      },
    },
  }
}

describe('GitHub review states', () => {
  it('requires bound dependencies before a state entry effect runs', () => {
    expect(() => SubmittingPrState.parse('SUBMITTING_PR').afterEntry()).toThrow('dependencies')
    expect(() => ReviewingState.parse('REVIEWING').afterEntry()).toThrow('dependencies')
  })

  it('creates and records a ready pull request during submitting entry', () => {
    const { context, events } = stateContext(
      WorkflowState.initial().with({ githubIssue: 42, featureBranch: 'issue-42' }),
    )
    SubmittingPrState.parse('SUBMITTING_PR').withEntryContext(context).afterEntry()
    expect(events).toStrictEqual([
      {
        type: 'pr-recorded',
        at: AT,
        prNumber: 9,
        prUrl: 'https://example.test/pr/9',
      },
    ])
  })

  it('rejects a draft pull request during submitting entry', () => {
    const { context } = stateContext(
      WorkflowState.initial().with({ githubIssue: 42, featureBranch: 'issue-42' }),
      undefined,
      () => ({ prNumber: 9, prUrl: 'https://example.test/pr/9', isDraft: true }),
    )
    expect(() =>
      SubmittingPrState.parse('SUBMITTING_PR').withEntryContext(context).afterEntry(),
    ).toThrow('ready for review')
  })

  it('requires the issue and branch before submitting entry creates a pull request', () => {
    const noIssue = stateContext(WorkflowState.initial().with({ featureBranch: 'issue-42' }))
    expect(() =>
      SubmittingPrState.parse('SUBMITTING_PR').withEntryContext(noIssue.context).afterEntry(),
    ).toThrow('githubIssue')
    const noBranch = stateContext(WorkflowState.initial().with({ githubIssue: 42 }))
    expect(() =>
      SubmittingPrState.parse('SUBMITTING_PR').withEntryContext(noBranch.context).afterEntry(),
    ).toThrow('featureBranch')
  })

  it('blocks on CodeRabbit rate limiting', () => {
    const { context, events } = stateContext(
      WorkflowState.initial().with({ currentStateMachineState: 'REVIEWING', prNumber: 9 }),
      githubFeedback({ coderabbitRateLimited: true }),
    )
    ReviewingState.parse('REVIEWING').withEntryContext(context).afterEntry()
    expect(events).toContainEqual(expect.objectContaining({ type: 'transitioned', to: 'BLOCKED' }))
  })

  it('moves to addressing when CodeRabbit has an open thread', () => {
    const { context, events } = stateContext(
      WorkflowState.initial().with({ currentStateMachineState: 'REVIEWING', prNumber: 9 }),
      githubFeedback({
        coderabbitReviewSeen: true,
        threads: [codeRabbitThread('coderabbitai')],
      }),
    )
    ReviewingState.parse('REVIEWING').withEntryContext(context).afterEntry()
    expect(events).toContainEqual(
      expect.objectContaining({ reviewer: 'coderabbit', status: 'OPEN_FEEDBACK' }),
    )
    expect(events).toContainEqual(
      expect.objectContaining({ type: 'transitioned', to: 'ADDRESSING_FEEDBACK' }),
    )
  })

  it('waits in reviewing until the pull request exists and CodeRabbit responds', () => {
    const noPullRequest = stateContext(
      WorkflowState.initial().with({ currentStateMachineState: 'REVIEWING' }),
    )
    ReviewingState.parse('REVIEWING').withEntryContext(noPullRequest.context).afterEntry()
    expect(noPullRequest.events).toStrictEqual([])

    const pendingCodeRabbit = stateContext(
      WorkflowState.initial().with({ currentStateMachineState: 'REVIEWING', prNumber: 9 }),
    )
    ReviewingState.parse('REVIEWING').withEntryContext(pendingCodeRabbit.context).afterEntry()
    expect(pendingCodeRabbit.events).toStrictEqual([])
  })

  it('recognises the CodeRabbit bot login and does not repeat an unchanged status', () => {
    const { context, events } = stateContext(
      WorkflowState.initial().with({
        currentStateMachineState: 'REVIEWING',
        prNumber: 9,
        reviewerStatuses: reviewerStatuses({ coderabbit: 'OPEN_FEEDBACK' }),
      }),
      githubFeedback({
        coderabbitReviewSeen: true,
        threads: [codeRabbitThread('coderabbitai[bot]')],
      }),
    )
    ReviewingState.parse('REVIEWING').withEntryContext(context).afterEntry()
    expect(events).not.toContainEqual(expect.objectContaining({ reviewer: 'coderabbit' }))
    expect(events).toContainEqual(
      expect.objectContaining({ type: 'transitioned', to: 'ADDRESSING_FEEDBACK' }),
    )
  })

  it('moves to human review only after every reviewer is approved', () => {
    const { context, events } = stateContext(
      WorkflowState.initial().with({
        currentStateMachineState: 'REVIEWING',
        prNumber: 9,
        reviewerStatuses: reviewerStatuses({
          coderabbit: 'PENDING',
          'architecture-review': 'APPROVED',
          'code-review': 'APPROVED',
          'bug-scanner': 'APPROVED',
          'task-check': 'APPROVED',
        }),
      }),
      githubFeedback({ coderabbitReviewSeen: true }),
    )
    ReviewingState.parse('REVIEWING').withEntryContext(context).afterEntry()
    expect(events).toContainEqual(
      expect.objectContaining({ reviewer: 'coderabbit', status: 'APPROVED' }),
    )
    expect(events).toContainEqual(
      expect.objectContaining({ type: 'transitioned', to: 'HUMAN_REVIEWING' }),
    )
  })
})
