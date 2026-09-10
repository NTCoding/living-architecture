import { vi } from 'vitest'
import { WorkflowState } from '../workflow-types'
import type { WorkflowEvent } from '../workflow-events'
import { ReviewingState } from './reviewing'
import { SubmittingPrState } from './submitting-pr'
import type { ReadWorkflowPullRequestFeedback } from '../ports/read-pull-request-feedback'
import type { ReviewAgentName } from '../ports/review-launcher'
import { Reviewer } from '../reviews/reviewers'
import type { ReviewOutcome } from '../workflow'

const AT = '2026-01-01T00:00:00Z'
type PullRequestFeedback = ReturnType<ReadWorkflowPullRequestFeedback>

function githubFeedback(overrides: Partial<PullRequestFeedback> = {}): PullRequestFeedback {
  return {
    reviewerStatuses: {
      'architecture-review': 'APPROVED',
      'code-review': 'APPROVED',
      'bug-scanner': 'APPROVED',
      'task-check': 'APPROVED',
      coderabbit: 'APPROVED',
    },
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
  depsOverrides: Partial<{
    getPrFeedback: () => PullRequestFeedback
    sleepMs: (milliseconds: number) => void
    runReviewers: (requests: readonly { readonly reviewer: ReviewAgentName }[]) => void
    reviewOutcome: (options: { readonly ignoreCodeRabbit?: boolean }) => ReviewOutcome
  }> = {},
) {
  const events: unknown[] = []
  const stateBox = { value: state }
  return {
    events,
    context: {
      workflow: {
        getState: () => stateBox.value,
        getSubmissionDetails: () => ({
          githubIssue: stateBox.value.githubIssue ?? 42,
          featureBranch: stateBox.value.featureBranch ?? 'issue-42',
        }),
        getPullRequestNumber: () => stateBox.value.prNumber ?? 9,
        appendEvent: (event: WorkflowEvent) => {
          events.push(event)
          stateBox.value = stateBox.value.apply(event)
        },
        recordReviewerStatus: (
          reviewer: Reviewer,
          status: 'PENDING' | 'OPEN_FEEDBACK' | 'APPROVED',
        ) => {
          events.push({ reviewer: reviewer.name(), status })
          stateBox.value = stateBox.value.with({
            reviewerStatuses: {
              ...stateBox.value.reviewerStatuses,
              [reviewer.name()]: status,
            },
          })
          return { pass: true }
        },
        recordPullRequest: (prNumber: number, prUrl: string) => {
          events.push({ type: 'pr-recorded', at: AT, prNumber, prUrl })
          stateBox.value = stateBox.value.with({ prNumber, prUrl })
          return { pass: true }
        },
        transition: (target: 'ADDRESSING_FEEDBACK' | 'HUMAN_REVIEWING' | 'BLOCKED') => {
          events.push({
            type: 'transitioned',
            from: stateBox.value.currentStateMachineState,
            to: target,
          })
          stateBox.value = stateBox.value.with({ currentStateMachineState: target })
          return { pass: true }
        },
        reviewOutcome: depsOverrides.reviewOutcome ?? (() => 'APPROVED'),
      },
      deps: {
        getPrFeedback: depsOverrides.getPrFeedback ?? (() => feedback),
        sleepMs: depsOverrides.sleepMs ?? (() => undefined),
        createPullRequest,
        now: () => AT,
        reviewLauncher: {
          run: (requests: readonly { readonly reviewer: ReviewAgentName }[]) => {
            depsOverrides.runReviewers?.(requests)
          },
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
    SubmittingPrState.parse('SUBMITTING_PR', context).afterEntry()
    expect(events).toStrictEqual([
      {
        type: 'pr-recorded',
        at: AT,
        prNumber: 9,
        prUrl: 'https://example.test/pr/9',
      },
    ])
  })

  it('does not create a second pull request when one is already recorded', () => {
    const createPullRequest = vi.fn(() => ({
      prNumber: 10,
      prUrl: 'https://example.test/pr/10',
      isDraft: false,
    }))
    const { context, events } = stateContext(
      WorkflowState.initial().with({ githubIssue: 42, featureBranch: 'issue-42', prNumber: 9 }),
      undefined,
      createPullRequest,
    )
    SubmittingPrState.parse('SUBMITTING_PR', context).afterEntry()
    expect(createPullRequest).not.toHaveBeenCalled()
    expect(events).toStrictEqual([])
  })

  it('requests a ready pull request during submitting entry', () => {
    const { context, events } = stateContext(
      WorkflowState.initial().with({ githubIssue: 42, featureBranch: 'issue-42' }),
      undefined,
      () => ({ prNumber: 9, prUrl: 'https://example.test/pr/9', isDraft: false }),
    )
    SubmittingPrState.parse('SUBMITTING_PR', context).afterEntry()
    expect(events).toContainEqual(expect.objectContaining({ type: 'pr-recorded' }))
  })

  it('skips CodeRabbit when rate limited', () => {
    const { context, events } = stateContext(
      WorkflowState.initial().with({ currentStateMachineState: 'REVIEWING', prNumber: 9 }),
      githubFeedback({ coderabbitRateLimited: true }),
    )
    ReviewingState.parse('REVIEWING', context).afterEntry()
    expect(events).toContainEqual(expect.objectContaining({ reviewer: 'architecture-review' }))
    expect(events).toContainEqual(
      expect.objectContaining({ type: 'transitioned', to: 'HUMAN_REVIEWING' }),
    )
  })

  it('moves to addressing when CodeRabbit has an open thread', () => {
    const { context, events } = stateContext(
      WorkflowState.initial().with({ currentStateMachineState: 'REVIEWING', prNumber: 9 }),
      githubFeedback({
        coderabbitReviewSeen: true,
        threads: [codeRabbitThread('coderabbitai')],
      }),
      undefined,
      { reviewOutcome: () => 'OPEN_FEEDBACK' },
    )
    ReviewingState.parse('REVIEWING', context).afterEntry()
    expect(events).toContainEqual(
      expect.objectContaining({ reviewer: 'coderabbit', status: 'OPEN_FEEDBACK' }),
    )
    expect(events).toContainEqual(
      expect.objectContaining({ type: 'transitioned', to: 'ADDRESSING_FEEDBACK' }),
    )
  })

  it('waits for CodeRabbit before completing reviewing', () => {
    const respondedCodeRabbit = stateContext(
      WorkflowState.initial().with({ currentStateMachineState: 'REVIEWING', prNumber: 9 }),
      githubFeedback({ coderabbitReviewSeen: true }),
    )
    ReviewingState.parse('REVIEWING', respondedCodeRabbit.context).afterEntry()
    expect(respondedCodeRabbit.events).toContainEqual(
      expect.objectContaining({ type: 'transitioned', to: 'HUMAN_REVIEWING' }),
    )
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
      undefined,
      { reviewOutcome: () => 'OPEN_FEEDBACK' },
    )
    ReviewingState.parse('REVIEWING', context).afterEntry()
    expect(events).not.toContainEqual(expect.objectContaining({ reviewer: 'coderabbit' }))
    expect(events).toContainEqual(
      expect.objectContaining({ type: 'transitioned', to: 'ADDRESSING_FEEDBACK' }),
    )
  })

  it('does not launch reviewers that have already approved', () => {
    const launched: ReviewAgentName[] = []
    const { context } = stateContext(
      WorkflowState.initial().with({
        currentStateMachineState: 'REVIEWING',
        prNumber: 9,
        reviewerStatuses: reviewerStatuses({ 'code-review': 'APPROVED' }),
      }),
      githubFeedback({ coderabbitReviewSeen: true }),
      undefined,
      { runReviewers: (requests) => launched.push(...requests.map((request) => request.reviewer)) },
    )
    ReviewingState.parse('REVIEWING', context).afterEntry()
    expect(launched).not.toContain('code-review')
    expect(launched).toStrictEqual(['architecture-review', 'bug-scanner', 'task-check'])
  })

  it('does not treat a non-CodeRabbit thread author as CodeRabbit feedback', () => {
    const { context, events } = stateContext(
      WorkflowState.initial().with({ currentStateMachineState: 'REVIEWING', prNumber: 9 }),
      githubFeedback({ coderabbitReviewSeen: true, threads: [codeRabbitThread('reviewer')] }),
    )
    ReviewingState.parse('REVIEWING', context).afterEntry()
    expect(events).toContainEqual(
      expect.objectContaining({ type: 'transitioned', to: 'HUMAN_REVIEWING' }),
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
    ReviewingState.parse('REVIEWING', context).afterEntry()
    expect(events).toContainEqual(
      expect.objectContaining({ reviewer: 'coderabbit', status: 'APPROVED' }),
    )
    expect(events).toContainEqual(
      expect.objectContaining({ type: 'transitioned', to: 'HUMAN_REVIEWING' }),
    )
  })

  it('throws when a reviewer result is still pending after the completion wait', () => {
    const { context } = stateContext(
      WorkflowState.initial().with({
        currentStateMachineState: 'REVIEWING',
        prNumber: 9,
        reviewerStatuses: reviewerStatuses({ 'code-review': 'APPROVED' }),
      }),
      githubFeedback({
        coderabbitReviewSeen: true,
        reviewerStatuses: {
          'architecture-review': 'APPROVED',
          'code-review': 'PENDING',
          'bug-scanner': 'APPROVED',
          'task-check': 'APPROVED',
          coderabbit: 'APPROVED',
        },
      }),
      undefined,
      { reviewOutcome: () => 'PENDING' },
    )
    expect(() => ReviewingState.parse('REVIEWING', context).afterEntry()).toThrow(
      'Reviewing completion was evaluated before every reviewer returned a result.',
    )
  })

  it('stops polling after the finite completion limit', () => {
    const sleepMs = vi.fn()
    const getPrFeedback = vi.fn(() =>
      githubFeedback({
        coderabbitReviewSeen: true,
        reviewerStatuses: {
          'architecture-review': 'APPROVED',
          'code-review': 'PENDING',
          'bug-scanner': 'APPROVED',
          'task-check': 'APPROVED',
          coderabbit: 'APPROVED',
        },
      }),
    )
    const { context } = stateContext(
      WorkflowState.initial().with({ currentStateMachineState: 'REVIEWING', prNumber: 9 }),
      undefined,
      undefined,
      { getPrFeedback, sleepMs, reviewOutcome: () => 'PENDING' },
    )
    expect(() => ReviewingState.parse('REVIEWING', context).afterEntry()).toThrow(
      'Reviewing completion was evaluated before every reviewer returned a result.',
    )
    expect(getPrFeedback).toHaveBeenCalledTimes(120)
    expect(sleepMs).toHaveBeenCalledTimes(119)
  })

  it('polls for CodeRabbit completion before finishing reviewing', () => {
    const sleepMs = vi.fn()
    const getPrFeedback = vi
      .fn()
      .mockReturnValueOnce(githubFeedback({ coderabbitReviewSeen: false }))
      .mockReturnValueOnce(githubFeedback({ coderabbitReviewSeen: true }))
    const { context, events } = stateContext(
      WorkflowState.initial().with({ currentStateMachineState: 'REVIEWING', prNumber: 9 }),
      githubFeedback(),
      undefined,
      { getPrFeedback, sleepMs },
    )
    ReviewingState.parse('REVIEWING', context).afterEntry()
    expect(sleepMs).toHaveBeenCalledTimes(1)
    expect(sleepMs).toHaveBeenCalledWith(15_000)
    expect(events).toContainEqual(
      expect.objectContaining({ type: 'transitioned', to: 'HUMAN_REVIEWING' }),
    )
  })
})
