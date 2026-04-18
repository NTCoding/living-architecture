import {
  describe, it, expect, vi 
} from 'vitest'
import {
  makeDeps,
  eventsToAwaitingPrFeedback,
  unresolvedThread,
} from './fixtures/workflow-test-fixtures'
import { Workflow } from './workflow'
import { applyEvents } from './fold'

describe('Workflow', () => {
  describe('appendEvent — AWAITING_PR_FEEDBACK side effect', () => {
    it('awaits CodeRabbit feedback and auto-transitions to REFLECTING when clean', () => {
      const state = applyEvents([...eventsToAwaitingPrFeedback().slice(0, -1)])
      const sleepMs = vi.fn()
      const getPrFeedback = vi.fn(() => ({
        reviewDecision: 'APPROVED',
        coderabbitReviewSeen: true,
        unresolvedCount: 0,
        threads: [],
      }))
      const wf = Workflow.rehydrate(
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
      const state = applyEvents([...eventsToAwaitingPrFeedback().slice(0, -1)])
      const wf = Workflow.rehydrate(
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

    it('applies ADDRESSING_FEEDBACK onEntry overrides during the automatic transition', () => {
      const state = applyEvents([
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
      const wf = Workflow.rehydrate(
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
      const state = applyEvents([...eventsToAwaitingPrFeedback().slice(0, -1)])
      const sleepMs = vi.fn()
      const wf = Workflow.rehydrate(
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
      expect(wf.getPendingEvents().at(-1)).toMatchObject({
        type: 'transitioned',
        to: 'BLOCKED',
      })
      expect(sleepMs).toHaveBeenCalledTimes(20)
    })

    it('auto-transitions to BLOCKED when fetching PR feedback throws or no PR is recorded', () => {
      const withPr = Workflow.rehydrate(
        applyEvents([...eventsToAwaitingPrFeedback().slice(0, -1)]),
        makeDeps({
          getPrFeedback: () => {
            throw new TypeError('GitHub unavailable')
          },
        }),
      )
      const withoutPr = Workflow.rehydrate(
        applyEvents([
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

      for (const wf of [withPr, withoutPr]) {
        wf.appendEvent({
          type: 'transitioned',
          at: '2026-01-01T00:00:00Z',
          from: 'AWAITING_CI',
          to: 'AWAITING_PR_FEEDBACK',
        })
        expect(wf.getState().currentStateMachineState).toStrictEqual('BLOCKED')
      }
    })
  })
})
