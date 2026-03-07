import {
  spec,
  makeDeps,
  transitioned,
  eventsToCheckingFeedback,
  eventsToAddressingFeedback,
  eventsToReflecting,
} from './fixtures/workflow-test-fixtures'
import { Workflow } from './workflow'
import { applyEvents } from './fold'
import type { WorkflowEvent } from './workflow-events'

describe('Workflow', () => {
  describe('appendEvent — autoFetchFeedback side effect', () => {
    it('auto-fetches feedback when appendEvent receives transition to CHECKING_FEEDBACK', () => {
      const events: readonly WorkflowEvent[] = [...eventsToCheckingFeedback().slice(0, -1)]
      const state = applyEvents(events)
      const deps = makeDeps({
        getPrFeedback: () => ({
          unresolvedCount: 0,
          threads: [],
        }),
      })
      const wf = Workflow.rehydrate(state, deps)
      const transitionEvent = {
        type: 'transitioned',
        at: '2026-01-01T00:00:00Z',
        from: 'AWAITING_CI',
        to: 'CHECKING_FEEDBACK',
      }
      wf.appendEvent(transitionEvent)
      const pending = wf.getPendingEvents()
      expect(pending).toHaveLength(2)
      expect(pending[0]).toMatchObject({
        type: 'transitioned',
        to: 'CHECKING_FEEDBACK',
      })
      expect(pending[1]).toMatchObject({
        type: 'feedback-checked',
        clean: true,
      })
    })

    it('auto-fetches feedback with unresolved count', () => {
      const events: readonly WorkflowEvent[] = [...eventsToCheckingFeedback().slice(0, -1)]
      const state = applyEvents(events)
      const deps = makeDeps({
        getPrFeedback: () => ({
          unresolvedCount: 3,
          threads: [
            {
              id: 't1',
              isResolved: false,
              isOutdated: false,
              path: 'f.ts',
              line: 1,
              comments: [],
            },
            {
              id: 't2',
              isResolved: false,
              isOutdated: false,
              path: 'g.ts',
              line: 2,
              comments: [],
            },
            {
              id: 't3',
              isResolved: false,
              isOutdated: false,
              path: 'h.ts',
              line: 3,
              comments: [],
            },
          ],
        }),
      })
      const wf = Workflow.rehydrate(state, deps)
      const transitionEvent = {
        type: 'transitioned',
        at: '2026-01-01T00:00:00Z',
        from: 'AWAITING_CI',
        to: 'CHECKING_FEEDBACK',
      }
      wf.appendEvent(transitionEvent)
      const pending = wf.getPendingEvents()
      expect(pending).toHaveLength(2)
      expect(pending[1]).toMatchObject({
        type: 'feedback-checked',
        clean: false,
        unresolvedCount: 3,
      })
      expect(wf.getState().feedbackClean).toBe(false)
      expect(wf.getState().feedbackUnresolvedCount).toBe(3)
    })

    it('does not auto-fetch feedback when transitioning to other states', () => {
      const deps = makeDeps()
      const wf = Workflow.createFresh(deps)
      const event = {
        type: 'transitioned',
        at: '2026-01-01T00:00:00Z',
        from: 'IMPLEMENTING',
        to: 'BLOCKED',
      }
      wf.appendEvent(event)
      expect(wf.getPendingEvents()).toHaveLength(1)
    })

    it('does not auto-fetch feedback when no prNumber', () => {
      const state = applyEvents([
        transitioned('IMPLEMENTING', 'REVIEWING'),
        ...([
          {
            type: 'architecture-review-completed',
            at: '2026-01-01T00:00:00Z',
            passed: true,
          },
          {
            type: 'code-review-completed',
            at: '2026-01-01T00:00:00Z',
            passed: true,
          },
          {
            type: 'bug-scanner-completed',
            at: '2026-01-01T00:00:00Z',
            passed: true,
          },
        ] as const),
        transitioned('REVIEWING', 'SUBMITTING_PR'),
        {
          type: 'pr-recorded',
          at: '2026-01-01T00:00:00Z',
          prNumber: 99,
        } as const,
        transitioned('SUBMITTING_PR', 'AWAITING_CI'),
        {
          type: 'ci-completed',
          at: '2026-01-01T00:00:00Z',
          passed: true,
        } as const,
      ])
      const deps = makeDeps()
      const wf = Workflow.rehydrate(state, deps)
      const transitionEvent = {
        type: 'transitioned',
        at: '2026-01-01T00:00:00Z',
        from: 'AWAITING_CI',
        to: 'CHECKING_FEEDBACK',
      }
      wf.appendEvent(transitionEvent)
      expect(wf.getPendingEvents()).toHaveLength(2)
    })
  })

  describe('CHECKING_FEEDBACK state', () => {
    it('records feedback clean', () => {
      const {
        result, state 
      } = spec
        .given(...eventsToCheckingFeedback())
        .when((wf) => wf.executeRecording('record-feedback-clean'))
      expect(result).toStrictEqual({ pass: true })
      expect(state.feedbackClean).toBe(true)
    })

    it('records feedback exists with unresolved count', () => {
      const {
        result, state 
      } = spec
        .given(...eventsToCheckingFeedback())
        .when((wf) => wf.executeRecording('record-feedback-exists', 3))
      expect(result).toStrictEqual({ pass: true })
      expect(state.feedbackClean).toBe(false)
      expect(state.feedbackUnresolvedCount).toBe(3)
    })

    it('fails record-feedback-clean in non-CHECKING_FEEDBACK states', () => {
      const { result } = spec.given().when((wf) => wf.executeRecording('record-feedback-clean'))
      expect(result.pass).toBe(false)
    })

    it('fails record-feedback-exists in non-CHECKING_FEEDBACK states', () => {
      const { result } = spec.given().when((wf) => wf.executeRecording('record-feedback-exists', 1))
      expect(result.pass).toBe(false)
    })
  })

  describe('ADDRESSING_FEEDBACK state', () => {
    it('records feedback addressed with count', () => {
      const {
        result, state 
      } = spec
        .given(...eventsToAddressingFeedback())
        .when((wf) => wf.executeRecording('record-feedback-addressed', 3))
      expect(result).toStrictEqual({ pass: true })
      expect(state.feedbackAddressed).toBe(true)
      expect(state.feedbackAddressedCount).toBe(3)
    })

    it('fails record-feedback-addressed in non-ADDRESSING_FEEDBACK states', () => {
      const { result } = spec
        .given()
        .when((wf) => wf.executeRecording('record-feedback-addressed', 1))
      expect(result.pass).toBe(false)
    })

    it('resets feedbackAddressed and feedbackClean on entry via stateOverrides', () => {
      const { state } = spec.given(...eventsToAddressingFeedback()).when((wf) => wf.getState())
      expect(state.feedbackAddressed).toBe(false)
      expect(state.feedbackClean).toBe(false)
      expect(state.feedbackAddressedCount).toBeUndefined()
    })
  })

  describe('REFLECTING state', () => {
    it('records reflection', () => {
      const {
        result, state 
      } = spec
        .given(...eventsToReflecting())
        .when((wf) => wf.executeRecording('record-reflection', '/test-output/r.md'))
      expect(result).toStrictEqual({ pass: true })
      expect(state.reflectionPath).toBe('/test-output/r.md')
    })

    it('fails record-reflection in non-REFLECTING states', () => {
      const { result } = spec
        .given()
        .when((wf) => wf.executeRecording('record-reflection', '/test-output/r.md'))
      expect(result.pass).toBe(false)
    })
  })
})
