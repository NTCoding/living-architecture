import { describe, expect, it, vi } from 'vitest'
import type { ReadWorkflowPullRequestFeedback } from './ports/read-pull-request-feedback'
import { WorkflowState } from './workflow-types'
import {
  buildTestWorkflow,
  eventsToReviewing,
  makeDeps,
} from './__fixtures__/workflow-test-fixtures'

type PullRequestFeedback = ReturnType<ReadWorkflowPullRequestFeedback>

function githubFeedback(overrides: Partial<PullRequestFeedback> = {}): PullRequestFeedback {
  return {
    reviewerStatuses: {
      'architecture-review': 'APPROVED',
      'code-review': 'APPROVED',
      'bug-scanner': 'APPROVED',
      'task-check': 'APPROVED',
      coderabbit: 'PENDING',
    },
    reviewDecision: null,
    coderabbitReviewSeen: true,
    unresolvedCount: 0,
    threads: [],
    ...overrides,
  }
}

function reviewingWorkflow(deps = makeDeps()) {
  return buildTestWorkflow(deps, WorkflowState.from(eventsToReviewing()).with({ prNumber: 99 }))
}

function reviewingWithOpenCycle(deps = makeDeps()) {
  const workflow = reviewingWorkflow(deps)
  workflow.startReviewCycle()
  return workflow
}

describe('startReviewCycle', () => {
  it('opens the first cycle with every reviewer included', () => {
    const workflow = reviewingWorkflow()

    expect(workflow.startReviewCycle()).toStrictEqual({ pass: true })
    expect(workflow.getState().reviewCycleNumber).toBe(1)
    expect(workflow.getState().reviewCycleOpen).toBe(true)
    expect(workflow.getPendingEvents().at(-1)).toMatchObject({
      type: 'review-cycle-started',
      cycleNumber: 1,
      includedReviewers: ['architecture-review', 'code-review', 'bug-scanner', 'task-check'],
      excludedReviewers: {},
    })
  })

  it('excludes reviewers that already approved with a reason', () => {
    const state = WorkflowState.from(eventsToReviewing()).with({
      reviewerStatuses: {
        'architecture-review': 'PENDING',
        'code-review': 'PENDING',
        'bug-scanner': 'PENDING',
        'task-check': 'APPROVED',
        coderabbit: 'PENDING',
      },
    })
    const workflow = buildTestWorkflow(makeDeps(), state)

    workflow.startReviewCycle()

    expect(workflow.getPendingEvents().at(-1)).toMatchObject({
      includedReviewers: ['architecture-review', 'code-review', 'bug-scanner'],
      excludedReviewers: { 'task-check': 'already-approved' },
    })
  })

  it('refuses to start a cycle while one is open', () => {
    const workflow = reviewingWithOpenCycle()

    expect(workflow.startReviewCycle()).toStrictEqual({
      pass: false,
      reason: 'A review cycle is already open.',
    })
  })

  it('refuses to start a cycle outside reviewing', () => {
    const workflow = buildTestWorkflow(makeDeps())

    expect(workflow.startReviewCycle()).toStrictEqual({
      pass: false,
      reason: 'A review cycle can only start in REVIEWING.',
    })
  })
})

describe('waitForCodeRabbitAndCloseReviewCycle', () => {
  it('closes the review cycle when every reviewer approved', () => {
    const workflow = reviewingWithOpenCycle()

    expect(workflow.waitForCodeRabbitAndCloseReviewCycle()).toStrictEqual({ pass: true })
    expect(workflow.getState().reviewCycleOpen).toBe(false)
    expect(workflow.getPendingEvents().map((event) => event.type)).toContain('review-cycle-closed')
  })

  it('moves to human review when every reviewer approved', () => {
    const workflow = reviewingWithOpenCycle()

    expect(workflow.waitForCodeRabbitAndCloseReviewCycle()).toStrictEqual({ pass: true })
    expect(workflow.getState().currentStateMachineState).toBe('HUMAN_REVIEWING')
  })

  it('moves to addressing feedback when a reviewer left feedback', () => {
    const workflow = reviewingWithOpenCycle(
      makeDeps({
        getPrFeedback: () =>
          githubFeedback({
            reviewerStatuses: {
              'architecture-review': 'APPROVED',
              'code-review': 'OPEN_FEEDBACK',
              'bug-scanner': 'APPROVED',
              'task-check': 'APPROVED',
              coderabbit: 'PENDING',
            },
          }),
      }),
    )

    expect(workflow.waitForCodeRabbitAndCloseReviewCycle()).toStrictEqual({ pass: true })
    expect(workflow.getState().currentStateMachineState).toBe('ADDRESSING_FEEDBACK')
  })

  it('polls until CodeRabbit reviews the current commit', () => {
    const getPrFeedback = vi
      .fn<ReadWorkflowPullRequestFeedback>()
      .mockReturnValueOnce(githubFeedback({ coderabbitReviewSeen: false }))
      .mockReturnValueOnce(githubFeedback({ coderabbitReviewSeen: true }))
    const sleepMs = vi.fn()
    const workflow = reviewingWithOpenCycle(makeDeps({ getPrFeedback, sleepMs }))

    expect(workflow.waitForCodeRabbitAndCloseReviewCycle()).toStrictEqual({ pass: true })
    expect(sleepMs).toHaveBeenCalledWith(15_000)
    expect(workflow.getState().currentStateMachineState).toBe('HUMAN_REVIEWING')
  })

  it('treats a rate-limited CodeRabbit as approved', () => {
    const workflow = reviewingWithOpenCycle(
      makeDeps({
        getPrFeedback: () =>
          githubFeedback({ coderabbitRateLimited: true, coderabbitReviewSeen: false }),
      }),
    )

    expect(workflow.waitForCodeRabbitAndCloseReviewCycle()).toStrictEqual({ pass: true })
    expect(workflow.getState().currentStateMachineState).toBe('HUMAN_REVIEWING')
    expect(workflow.getState().reviewerStatuses.toJSON()['coderabbit']).toBe('RATE_LIMITED')
  })

  it('treats an open CodeRabbit thread as feedback', () => {
    const workflow = reviewingWithOpenCycle(
      makeDeps({
        getPrFeedback: () =>
          githubFeedback({
            threads: [
              {
                id: 'thread-1',
                isResolved: false,
                isOutdated: false,
                path: 'orders.ts',
                line: 1,
                comments: [{ author: { login: 'coderabbitai' }, body: 'Please fix' }],
              },
            ],
          }),
      }),
    )

    expect(workflow.waitForCodeRabbitAndCloseReviewCycle()).toStrictEqual({ pass: true })
    expect(workflow.getState().currentStateMachineState).toBe('ADDRESSING_FEEDBACK')
  })

  it('treats an open CodeRabbit bot thread as feedback', () => {
    const workflow = reviewingWithOpenCycle(
      makeDeps({
        getPrFeedback: () =>
          githubFeedback({
            threads: [
              {
                id: 'thread-2',
                isResolved: false,
                isOutdated: false,
                path: 'orders.ts',
                line: 1,
                comments: [{ author: { login: 'coderabbitai[bot]' }, body: 'Please fix' }],
              },
            ],
          }),
      }),
    )

    expect(workflow.waitForCodeRabbitAndCloseReviewCycle()).toStrictEqual({ pass: true })
    expect(workflow.getState().currentStateMachineState).toBe('ADDRESSING_FEEDBACK')
  })

  it('ignores a resolved CodeRabbit thread', () => {
    const workflow = reviewingWithOpenCycle(
      makeDeps({
        getPrFeedback: () =>
          githubFeedback({
            threads: [
              {
                id: 'thread-resolved',
                isResolved: true,
                isOutdated: false,
                path: 'orders.ts',
                line: 1,
                comments: [{ author: { login: 'coderabbitai' }, body: 'Fixed' }],
              },
            ],
          }),
      }),
    )

    expect(workflow.waitForCodeRabbitAndCloseReviewCycle()).toStrictEqual({ pass: true })
    expect(workflow.getState().currentStateMachineState).toBe('HUMAN_REVIEWING')
  })

  it('ignores an outdated CodeRabbit thread', () => {
    const workflow = reviewingWithOpenCycle(
      makeDeps({
        getPrFeedback: () =>
          githubFeedback({
            threads: [
              {
                id: 'thread-outdated',
                isResolved: false,
                isOutdated: true,
                path: 'orders.ts',
                line: 1,
                comments: [{ author: { login: 'coderabbitai' }, body: 'Stale' }],
              },
            ],
          }),
      }),
    )

    expect(workflow.waitForCodeRabbitAndCloseReviewCycle()).toStrictEqual({ pass: true })
    expect(workflow.getState().currentStateMachineState).toBe('HUMAN_REVIEWING')
  })

  it('stops waiting when CodeRabbit never reviews', () => {
    const getPrFeedback = vi
      .fn<ReadWorkflowPullRequestFeedback>()
      .mockReturnValue(githubFeedback({ coderabbitReviewSeen: false }))
    const workflow = reviewingWithOpenCycle(makeDeps({ getPrFeedback, sleepMs: () => undefined }))

    expect(workflow.waitForCodeRabbitAndCloseReviewCycle()).toStrictEqual({
      pass: false,
      reason: 'Every reviewer must return a result before the review cycle can close.',
    })
  })

  it('refuses to close while a reviewer has not reported', () => {
    const workflow = reviewingWithOpenCycle(
      makeDeps({
        getPrFeedback: () =>
          githubFeedback({
            reviewerStatuses: {
              'architecture-review': 'APPROVED',
              'code-review': 'PENDING',
              'bug-scanner': 'APPROVED',
              'task-check': 'APPROVED',
              coderabbit: 'PENDING',
            },
          }),
      }),
    )

    expect(workflow.waitForCodeRabbitAndCloseReviewCycle()).toStrictEqual({
      pass: false,
      reason: 'Every reviewer must return a result before the review cycle can close.',
    })
    expect(workflow.getPendingEvents().map((event) => event.type)).not.toContain(
      'review-cycle-closed',
    )
  })

  it('refuses to close when no cycle is open', () => {
    const workflow = reviewingWorkflow()

    expect(workflow.waitForCodeRabbitAndCloseReviewCycle()).toStrictEqual({
      pass: false,
      reason: 'No review cycle is open.',
    })
  })

  it('is gated outside reviewing', () => {
    const workflow = buildTestWorkflow(makeDeps())

    expect(workflow.waitForCodeRabbitAndCloseReviewCycle()).toMatchObject({ pass: false })
  })
})
