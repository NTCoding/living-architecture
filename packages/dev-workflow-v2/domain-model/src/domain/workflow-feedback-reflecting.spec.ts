import { describe, it, expect, vi } from 'vitest'
import {
  makeDeps,
  eventsToAwaitingPrFeedback,
  unresolvedThread,
  rehydrateTestWorkflow,
} from './__fixtures__/workflow-test-fixtures'
import {
  GitHubUnavailableTestError,
  GitUnavailableTestError,
} from './__fixtures__/workflow-test-errors'
import { WorkflowState } from './workflow-types'

describe('Workflow', () => {
  describe('appendEvent — AWAITING_PR_FEEDBACK side effect', () => {
    it('awaits CodeRabbit feedback and auto-transitions to REFLECTING when clean', () => {
      const state = WorkflowState.replay([...eventsToAwaitingPrFeedback().slice(0, -1)])
      const sleepMs = vi.fn()
      const getPrFeedback = vi.fn(() => ({
        reviewDecision: 'APPROVED',
        coderabbitReviewSeen: true,
        unresolvedCount: 0,
        threads: [],
      }))
      const wf = rehydrateTestWorkflow(
        state,
        makeDeps({
          getPrFeedback,
          sleepMs,
        }),
      )

      wf.appendEvent({
        type: 'transitioned',
        at: '2026-01-01T00:00:00Z',
        from: 'AWAITING_CI',
        to: 'AWAITING_PR_FEEDBACK',
      })

      expect(wf.getPendingEvents()).toStrictEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'transitioned',
            to: 'AWAITING_PR_FEEDBACK',
          }),
          expect.objectContaining({
            type: 'feedback-checked',
            clean: true,
          }),
          expect.objectContaining({
            type: 'transitioned',
            to: 'REFLECTING',
          }),
        ]),
      )
      expect(wf.getState()).toMatchObject({
        currentStateMachineState: 'REFLECTING',
        feedbackClean: true,
      })
      expect(getPrFeedback).toHaveBeenCalledTimes(2)
      expect(sleepMs).toHaveBeenCalledTimes(1)
    })

    it('awaits CodeRabbit feedback and auto-transitions to ADDRESSING_FEEDBACK when feedback exists', () => {
      const state = WorkflowState.replay([...eventsToAwaitingPrFeedback().slice(0, -1)])
      const wf = rehydrateTestWorkflow(
        state,
        makeDeps({
          getPrFeedback: () => ({
            reviewDecision: 'CHANGES_REQUESTED',
            coderabbitReviewSeen: true,
            unresolvedCount: 2,
            threads: [unresolvedThread('t1'), unresolvedThread('t2')],
          }),
        }),
      )

      wf.appendEvent({
        type: 'transitioned',
        at: '2026-01-01T00:00:00Z',
        from: 'AWAITING_CI',
        to: 'AWAITING_PR_FEEDBACK',
      })

      expect(wf.getPendingEvents()).toStrictEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'feedback-checked',
            clean: false,
            unresolvedCount: 2,
          }),
          expect.objectContaining({
            type: 'transitioned',
            to: 'ADDRESSING_FEEDBACK',
          }),
        ]),
      )
      expect(wf.getState()).toMatchObject({
        currentStateMachineState: 'ADDRESSING_FEEDBACK',
        feedbackClean: false,
        feedbackUnresolvedCount: 2,
      })
    })

    it('immediately blocks when CodeRabbit is rate limited', () => {
      const state = WorkflowState.replay([...eventsToAwaitingPrFeedback().slice(0, -1)])
      const sleepMs = vi.fn()
      const wf = rehydrateTestWorkflow(
        state,
        makeDeps({
          getPrFeedback: () => ({
            reviewDecision: null,
            coderabbitReviewSeen: true,
            coderabbitRateLimited: true,
            unresolvedCount: 0,
            threads: [],
          }),
          sleepMs,
        }),
      )

      wf.appendEvent({
        type: 'transitioned',
        at: '2026-01-01T00:00:00Z',
        from: 'AWAITING_CI',
        to: 'AWAITING_PR_FEEDBACK',
      })

      expect(wf.getState().currentStateMachineState).toStrictEqual('BLOCKED')
      expect(wf.getPendingEvents().slice(-2)).toStrictEqual([
        expect.objectContaining({
          type: 'pr-feedback-verification-failed',
          reason: 'CodeRabbit rate limited. Wait, then resume AWAITING_PR_FEEDBACK.',
        }),
        expect.objectContaining({
          type: 'transitioned',
          to: 'BLOCKED',
        }),
      ])
      expect(sleepMs).not.toHaveBeenCalled()
    })

    it('blocks without reading Git status when CodeRabbit is rate limited', () => {
      const state = WorkflowState.replay([...eventsToAwaitingPrFeedback().slice(0, -1)])
      const wf = rehydrateTestWorkflow(
        state,
        makeDeps({
          getGitInfo: () => {
            throw new GitUnavailableTestError()
          },
          getPrFeedback: () => ({
            reviewDecision: null,
            coderabbitReviewSeen: true,
            coderabbitRateLimited: true,
            unresolvedCount: 0,
            threads: [],
          }),
        }),
      )

      wf.appendEvent({
        type: 'transitioned',
        at: '2026-01-01T00:00:00Z',
        from: 'AWAITING_CI',
        to: 'AWAITING_PR_FEEDBACK',
      })

      expect(wf.getState().currentStateMachineState).toStrictEqual('BLOCKED')
    })

    it('applies ADDRESSING_FEEDBACK onEntry overrides during the automatic transition', () => {
      const state = WorkflowState.replay([
        ...eventsToAwaitingPrFeedback().slice(0, -1),
        {
          type: 'feedback-checked',
          at: '2026-01-01T00:00:00Z',
          clean: true,
        },
        {
          type: 'feedback-addressed',
          at: '2026-01-01T00:00:00Z',
        },
      ] as const)
      const wf = rehydrateTestWorkflow(
        state,
        makeDeps({
          getPrFeedback: () => ({
            reviewDecision: 'CHANGES_REQUESTED',
            coderabbitReviewSeen: true,
            unresolvedCount: 1,
            threads: [unresolvedThread('t1')],
          }),
        }),
      )

      wf.appendEvent({
        type: 'transitioned',
        at: '2026-01-01T00:00:00Z',
        from: 'AWAITING_CI',
        to: 'AWAITING_PR_FEEDBACK',
      })

      expect(wf.getPendingEvents()).toStrictEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'transitioned',
            to: 'ADDRESSING_FEEDBACK',
            stateOverrides: { feedbackAddressed: false },
          }),
        ]),
      )
    })

    it('times out and auto-transitions to BLOCKED when CodeRabbit feedback never appears', () => {
      const state = WorkflowState.replay([...eventsToAwaitingPrFeedback().slice(0, -1)])
      const sleepMs = vi.fn()
      const wf = rehydrateTestWorkflow(
        state,
        makeDeps({
          getPrFeedback: () => ({
            reviewDecision: null,
            coderabbitReviewSeen: false,
            unresolvedCount: 0,
            threads: [],
          }),
          sleepMs,
        }),
      )

      wf.appendEvent({
        type: 'transitioned',
        at: '2026-01-01T00:00:00Z',
        from: 'AWAITING_CI',
        to: 'AWAITING_PR_FEEDBACK',
      })

      expect(wf.getState().currentStateMachineState).toStrictEqual('BLOCKED')
      expect(wf.getPendingEvents().slice(-2)).toStrictEqual([
        expect.objectContaining({
          type: 'pr-feedback-verification-failed',
          reason: 'CodeRabbit feedback did not appear within 300000ms for PR #99.',
        }),
        expect.objectContaining({
          type: 'transitioned',
          to: 'BLOCKED',
        }),
      ])
      expect(sleepMs).toHaveBeenCalledTimes(20)
    })

    it('publishes failure reason before auto-transitioning to BLOCKED when fetching PR feedback throws', () => {
      const withPr = rehydrateTestWorkflow(
        WorkflowState.replay([...eventsToAwaitingPrFeedback().slice(0, -1)]),
        makeDeps({
          getPrFeedback: () => {
            throw new GitHubUnavailableTestError()
          },
        }),
      )

      withPr.appendEvent({
        type: 'transitioned',
        at: '2026-01-01T00:00:00Z',
        from: 'AWAITING_CI',
        to: 'AWAITING_PR_FEEDBACK',
      })

      expect(withPr.getState().currentStateMachineState).toStrictEqual('BLOCKED')
      expect(withPr.getPendingEvents().slice(-2)).toStrictEqual([
        expect.objectContaining({
          type: 'pr-feedback-verification-failed',
          reason: 'Unable to fetch PR feedback: GitHubUnavailableTestError: GitHub unavailable',
        }),
        expect.objectContaining({
          type: 'transitioned',
          to: 'BLOCKED',
        }),
      ])
    })

    it('publishes failure reason before auto-transitioning to BLOCKED when no PR is recorded', () => {
      const withoutPr = rehydrateTestWorkflow(
        WorkflowState.replay([
          {
            type: 'issue-recorded',
            at: '2026-01-01T00:00:00Z',
            issueNumber: 42,
          },
          {
            type: 'transitioned',
            at: '2026-01-01T00:00:00Z',
            from: 'IMPLEMENTING',
            to: 'REVIEWING',
          },
          {
            type: 'transitioned',
            at: '2026-01-01T00:00:00Z',
            from: 'REVIEWING',
            to: 'SUBMITTING_PR',
          },
          {
            type: 'transitioned',
            at: '2026-01-01T00:00:00Z',
            from: 'SUBMITTING_PR',
            to: 'AWAITING_CI',
          },
        ] as const),
        makeDeps(),
      )

      withoutPr.appendEvent({
        type: 'transitioned',
        at: '2026-01-01T00:00:00Z',
        from: 'AWAITING_CI',
        to: 'AWAITING_PR_FEEDBACK',
      })

      expect(withoutPr.getState().currentStateMachineState).toStrictEqual('BLOCKED')
      expect(withoutPr.getPendingEvents().slice(-2)).toStrictEqual([
        expect.objectContaining({
          type: 'pr-feedback-verification-failed',
          reason: 'prNumber not set. Record the PR before awaiting PR feedback.',
        }),
        expect.objectContaining({
          type: 'transitioned',
          to: 'BLOCKED',
        }),
      ])
    })

    it('throws when AWAITING_PR_FEEDBACK transitions to BLOCKED without failure event', () => {
      const wf = rehydrateTestWorkflow(
        WorkflowState.replay(eventsToAwaitingPrFeedback()),
        makeDeps(),
      )

      expect(() =>
        wf.appendEvent({
          type: 'transitioned',
          at: '2026-01-01T00:00:00Z',
          from: 'AWAITING_PR_FEEDBACK',
          to: 'BLOCKED',
        }),
      ).toThrow(
        'Expected pr-feedback-verification-failed event before AWAITING_PR_FEEDBACK can transition to BLOCKED.',
      )
    })
  })
})
