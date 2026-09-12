import { getInitialWorkflowState, WorkflowState } from '../workflow-types'
import { ReviewingState } from './reviewing'
import type { ReadWorkflowPullRequestFeedback } from '../ports/read-pull-request-feedback'
import { Reviewer } from '../reviews/reviewers'
import type { ReviewOutcome } from '../workflow'
import { vi } from 'vitest'

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

function stateContext(
  state: WorkflowState,
  feedback: PullRequestFeedback = githubFeedback(),
  reviewOutcome: (options: { readonly ignoreCodeRabbit?: boolean }) => ReviewOutcome = () =>
    'APPROVED',
  depsOverrides: Partial<{
    getPrFeedback: () => PullRequestFeedback
    sleepMs: (milliseconds: number) => void
  }> = {},
) {
  const events: unknown[] = []
  const stateBox = { value: state }
  return {
    events,
    context: {
      workflow: {
        getState: () => stateBox.value,
        getPullRequestNumber: () => stateBox.value.prNumber ?? 9,
        recordReviewerStatus: (
          reviewer: Reviewer,
          status: 'PENDING' | 'OPEN_FEEDBACK' | 'APPROVED',
        ) => {
          events.push({ reviewer: reviewer.name(), status })
          stateBox.value = stateBox.value.with({
            reviewerStatuses: {
              ...stateBox.value.reviewerStatuses.toJSON(),
              [reviewer.name()]: status,
            },
          })
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
        reviewOutcome,
      },
      deps: {
        getPrFeedback: depsOverrides.getPrFeedback ?? (() => feedback),
        sleepMs: depsOverrides.sleepMs ?? (() => undefined),
        now: () => AT,
      },
    },
  }
}

describe('GitHub review states', () => {
  it('requires dependencies before reading GitHub review feedback', () => {
    expect(() => ReviewingState.parse('REVIEWING').afterEntry()).toThrow('dependencies')
  })

  it('blocks when GitHub reviewers have not run instead of staying in reviewing', () => {
    const sleepMs = vi.fn()
    const { context, events } = stateContext(
      getInitialWorkflowState().with({ currentStateMachineState: 'REVIEWING', prNumber: 9 }),
      githubFeedback({
        reviewerStatuses: {
          'architecture-review': 'PENDING',
          'code-review': 'PENDING',
          'bug-scanner': 'PENDING',
          'task-check': 'PENDING',
          coderabbit: 'PENDING',
        },
      }),
      () => 'PENDING',
      { sleepMs },
    )

    ReviewingState.parse('REVIEWING', context).afterEntry()

    expect(events).toStrictEqual([{ type: 'transitioned', from: 'REVIEWING', to: 'BLOCKED' }])
    expect(sleepMs).not.toHaveBeenCalled()
  })

  it('records GitHub reviewer statuses before moving to human review', () => {
    const { context, events } = stateContext(
      getInitialWorkflowState().with({ currentStateMachineState: 'REVIEWING', prNumber: 9 }),
    )

    ReviewingState.parse('REVIEWING', context).afterEntry()

    expect(events).toContainEqual({ reviewer: 'architecture-review', status: 'APPROVED' })
    expect(events).toContainEqual({
      type: 'transitioned',
      from: 'REVIEWING',
      to: 'HUMAN_REVIEWING',
    })
  })

  it('does not record a reviewer status that is already current', () => {
    const { context, events } = stateContext(
      getInitialWorkflowState().with({
        currentStateMachineState: 'REVIEWING',
        prNumber: 9,
        reviewerStatuses: {
          'architecture-review': 'APPROVED',
          'code-review': 'APPROVED',
          'bug-scanner': 'APPROVED',
          'task-check': 'APPROVED',
          coderabbit: 'APPROVED',
        },
      }),
      githubFeedback({ coderabbitReviewSeen: true }),
    )

    ReviewingState.parse('REVIEWING', context).afterEntry()

    expect(events).toStrictEqual([
      { type: 'transitioned', from: 'REVIEWING', to: 'HUMAN_REVIEWING' },
    ])
  })

  it('skips the CodeRabbit status and ignores CodeRabbit when rate limited', () => {
    const reviewOutcome = vi.fn((): ReviewOutcome => 'APPROVED')
    const sleepMs = vi.fn()
    const { context, events } = stateContext(
      getInitialWorkflowState().with({
        currentStateMachineState: 'REVIEWING',
        prNumber: 9,
        reviewerStatuses: {
          'architecture-review': 'APPROVED',
          'code-review': 'APPROVED',
          'bug-scanner': 'APPROVED',
          'task-check': 'APPROVED',
          coderabbit: 'PENDING',
        },
      }),
      githubFeedback({
        coderabbitRateLimited: true,
      }),
      reviewOutcome,
      { sleepMs },
    )

    ReviewingState.parse('REVIEWING', context).afterEntry()

    expect(reviewOutcome).toHaveBeenCalledWith({ ignoreCodeRabbit: true })
    expect(events).toStrictEqual([
      { type: 'transitioned', from: 'REVIEWING', to: 'HUMAN_REVIEWING' },
    ])
    expect(sleepMs).not.toHaveBeenCalled()
  })

  it('waits for CodeRabbit before recording approval and moving to human review', () => {
    const sleepMs = vi.fn()
    const getPrFeedback = vi
      .fn()
      .mockReturnValueOnce(githubFeedback({ coderabbitReviewSeen: false }))
      .mockReturnValueOnce(githubFeedback({ coderabbitReviewSeen: true }))
    const { context, events } = stateContext(
      getInitialWorkflowState().with({ currentStateMachineState: 'REVIEWING', prNumber: 9 }),
      undefined,
      () => 'APPROVED',
      { getPrFeedback, sleepMs },
    )

    ReviewingState.parse('REVIEWING', context).afterEntry()

    expect(getPrFeedback).toHaveBeenCalledTimes(2)
    expect(sleepMs).toHaveBeenCalledWith(15_000)
    expect(events).toContainEqual({ reviewer: 'coderabbit', status: 'APPROVED' })
    expect(events).toContainEqual({
      type: 'transitioned',
      from: 'REVIEWING',
      to: 'HUMAN_REVIEWING',
    })
  })

  it('records CodeRabbit feedback from its bot comment', () => {
    const { context, events } = stateContext(
      getInitialWorkflowState().with({ currentStateMachineState: 'REVIEWING', prNumber: 9 }),
      githubFeedback({
        coderabbitReviewSeen: true,
        threads: [
          {
            id: 'thread-1',
            isResolved: false,
            isOutdated: false,
            path: 'src/example.ts',
            line: 1,
            comments: [{ author: { login: 'coderabbitai[bot]' }, body: 'review feedback' }],
          },
        ],
      }),
      () => 'OPEN_FEEDBACK',
    )

    ReviewingState.parse('REVIEWING', context).afterEntry()

    expect(events).toContainEqual({ reviewer: 'coderabbit', status: 'OPEN_FEEDBACK' })
  })

  it('moves to addressing feedback when GitHub has reviewer feedback', () => {
    const { context, events } = stateContext(
      getInitialWorkflowState().with({ currentStateMachineState: 'REVIEWING', prNumber: 9 }),
      githubFeedback({
        reviewerStatuses: {
          'architecture-review': 'OPEN_FEEDBACK',
          'code-review': 'APPROVED',
          'bug-scanner': 'APPROVED',
          'task-check': 'APPROVED',
          coderabbit: 'APPROVED',
        },
      }),
      () => 'OPEN_FEEDBACK',
    )

    ReviewingState.parse('REVIEWING', context).afterEntry()

    expect(events).toContainEqual({ reviewer: 'architecture-review', status: 'OPEN_FEEDBACK' })
    expect(events).toContainEqual({
      type: 'transitioned',
      from: 'REVIEWING',
      to: 'ADDRESSING_FEEDBACK',
    })
  })
})
