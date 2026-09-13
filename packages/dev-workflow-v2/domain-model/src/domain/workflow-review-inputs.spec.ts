import { describe, expect, it } from 'vitest'
import { WorkflowState } from './workflow-types'
import {
  buildTestWorkflow,
  eventsToReviewing,
  makeDeps,
} from './__fixtures__/workflow-test-fixtures'

describe('review input operations', () => {
  it('returns stable reviewing inputs without appending workflow events', () => {
    const workflow = buildTestWorkflow(
      makeDeps({
        getReviewInputs: () => ({
          pr: { number: 99 },
          linkedIssues: [],
          reviewThreads: [],
          decisionHistory: [],
          range: 'base..head',
        }),
      }),
      WorkflowState.from(eventsToReviewing()).with({
        prNumber: 99,
        prUrl: 'https://example.test/pull/99',
        reviewCycleNumber: 1,
        includedReviewers: ['code-review'],
        excludedReviewers: { 'task-check': 'already-approved' },
      }),
    )

    expect(workflow.getReviewInputs()).toStrictEqual({ pass: true })
    expect(workflow.getPendingEvents()).toStrictEqual([])
    expect(workflow.getState().reviewInputs).toStrictEqual({
      pr: { number: 99 },
      reviewCycle: { number: 1, previousReviewedCommit: null, range: 'base..head' },
      includedReviewers: ['code-review'],
      excludedReviewers: { 'task-check': 'already-approved' },
      linkedIssues: [],
      reviewThreads: [],
      decisionHistory: [],
    })
    expect(workflow.getState().toJSON()).not.toHaveProperty('reviewInputs')
  })

  it('rejects review inputs outside reviewing', () => {
    expect(buildTestWorkflow(makeDeps()).getReviewInputs()).toStrictEqual({
      pass: false,
      reason: 'get-review-inputs can only run in REVIEWING.',
    })
  })

  it('rejects review inputs without a recorded pull request', () => {
    const workflow = buildTestWorkflow(makeDeps(), WorkflowState.from(eventsToReviewing()))
    expect(workflow.getReviewInputs()).toStrictEqual({
      pass: false,
      reason: 'Workflow has no recorded pull request.',
    })
  })

  it('rejects pull request context outside addressing feedback', () => {
    expect(buildTestWorkflow(makeDeps()).getPrContext()).toStrictEqual({
      pass: false,
      reason: 'get-pr-context can only run in ADDRESSING_FEEDBACK.',
    })
  })

  it('rejects pull request context without a recorded pull request', () => {
    const workflow = buildTestWorkflow(
      makeDeps(),
      WorkflowState.from(eventsToReviewing()).with({
        currentStateMachineState: 'ADDRESSING_FEEDBACK',
      }),
    )
    expect(workflow.getPrContext()).toStrictEqual({
      pass: false,
      reason: 'Workflow has no recorded pull request.',
    })
  })

  it('returns recorded pull request context while addressing feedback', () => {
    const workflow = buildTestWorkflow(
      makeDeps(),
      WorkflowState.from(eventsToReviewing()).with({
        currentStateMachineState: 'ADDRESSING_FEEDBACK',
        prNumber: 99,
        prUrl: 'https://example.test/pull/99',
      }),
    )

    expect(workflow.getPrContext()).toStrictEqual({ pass: true })
    expect(workflow.getPendingEvents()).toStrictEqual([])
    expect(workflow.getState().reviewInputs).toStrictEqual({
      prNumber: 99,
      prUrl: 'https://example.test/pull/99',
    })
  })
})
