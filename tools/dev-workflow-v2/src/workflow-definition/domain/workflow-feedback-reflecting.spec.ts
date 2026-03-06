import {
  spec,
  feedbackClean,
  feedbackExists,
  feedbackAddressed,
  reflectionWritten,
  transitioned,
  eventsToCheckingFeedback,
  eventsToAddressingFeedback,
  eventsToReflecting,
  eventsToComplete,
  eventsToAwaitingCi,
  ciPassed,
} from './fixtures/workflow-test-fixtures'

describe('Workflow', () => {
  describe('CHECKING_FEEDBACK state', () => {
    it('auto-fetches feedback on entry and sets feedbackClean when no unresolved', () => {
      const {
        state, events 
      } = spec
        .given(...eventsToAwaitingCi(), ciPassed())
        .withDeps({
          getPrFeedback: () => ({
            unresolvedCount: 0,
            threads: [],
          }),
        })
        .when((wf) => wf.transitionTo('CHECKING_FEEDBACK'))
      expect(state.feedbackClean).toBe(true)
      expect(events).toStrictEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'feedback-checked',
            clean: true,
          }),
        ]),
      )
    })

    it('auto-fetches feedback on entry and sets feedbackClean=false with count when unresolved', () => {
      const {
        state, events 
      } = spec
        .given(...eventsToAwaitingCi(), ciPassed())
        .withDeps({
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
        .when((wf) => wf.transitionTo('CHECKING_FEEDBACK'))
      expect(state.feedbackClean).toBe(false)
      expect(state.feedbackUnresolvedCount).toBe(3)
      expect(events).toStrictEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'feedback-checked',
            clean: false,
            unresolvedCount: 3,
          }),
        ]),
      )
    })

    it('transitions to REFLECTING when feedback clean', () => {
      const {
        result, state 
      } = spec
        .given(...eventsToCheckingFeedback(), feedbackClean())
        .when((wf) => wf.transitionTo('REFLECTING'))
      expect(result).toStrictEqual({ pass: true })
      expect(state.currentStateMachineState).toBe('REFLECTING')
    })

    it('fails transition to REFLECTING when feedback not clean', () => {
      const { result } = spec
        .given(...eventsToCheckingFeedback())
        .when((wf) => wf.transitionTo('REFLECTING'))
      expect(result.pass).toBe(false)
    })

    it('transitions to ADDRESSING_FEEDBACK when feedback exists', () => {
      const {
        result, state 
      } = spec
        .given(...eventsToCheckingFeedback(), feedbackExists(3))
        .when((wf) => wf.transitionTo('ADDRESSING_FEEDBACK'))
      expect(result).toStrictEqual({ pass: true })
      expect(state.currentStateMachineState).toBe('ADDRESSING_FEEDBACK')
    })

    it('fails transition to ADDRESSING_FEEDBACK when feedback clean', () => {
      const { result } = spec
        .given(...eventsToCheckingFeedback(), feedbackClean())
        .when((wf) => wf.transitionTo('ADDRESSING_FEEDBACK'))
      expect(result.pass).toBe(false)
    })

    it('records feedback clean', () => {
      const {
        result, state 
      } = spec
        .given(...eventsToCheckingFeedback())
        .when((wf) => wf.recordFeedbackClean())
      expect(result).toStrictEqual({ pass: true })
      expect(state.feedbackClean).toBe(true)
    })

    it('records feedback exists with unresolved count', () => {
      const {
        result, state 
      } = spec
        .given(...eventsToCheckingFeedback())
        .when((wf) => wf.recordFeedbackExists(3))
      expect(result).toStrictEqual({ pass: true })
      expect(state.feedbackClean).toBe(false)
      expect(state.feedbackUnresolvedCount).toBe(3)
    })

    it('fails recordFeedbackClean in non-CHECKING_FEEDBACK states', () => {
      const { result } = spec.given().when((wf) => wf.recordFeedbackClean())
      expect(result.pass).toBe(false)
    })

    it('fails recordFeedbackExists in non-CHECKING_FEEDBACK states', () => {
      const { result } = spec.given().when((wf) => wf.recordFeedbackExists(1))
      expect(result.pass).toBe(false)
    })

    it('transitions to BLOCKED', () => {
      const {
        result, state 
      } = spec
        .given(...eventsToCheckingFeedback())
        .when((wf) => wf.transitionTo('BLOCKED'))
      expect(result).toStrictEqual({ pass: true })
      expect(state.preBlockedState).toBe('CHECKING_FEEDBACK')
    })
  })

  describe('ADDRESSING_FEEDBACK state', () => {
    it('transitions to REVIEWING when feedback addressed with matching count', () => {
      const {
        result, state 
      } = spec
        .given(...eventsToAddressingFeedback(), feedbackAddressed(3))
        .when((wf) => wf.transitionTo('REVIEWING'))
      expect(result).toStrictEqual({ pass: true })
      expect(state.currentStateMachineState).toBe('REVIEWING')
    })

    it('fails transition to REVIEWING when feedback not addressed', () => {
      const { result } = spec
        .given(...eventsToAddressingFeedback())
        .when((wf) => wf.transitionTo('REVIEWING'))
      expect(result.pass).toBe(false)
    })

    it('fails transition when addressedCount is less than unresolvedCount', () => {
      const { result } = spec
        .given(...eventsToAddressingFeedback(), feedbackAddressed(1))
        .when((wf) => wf.transitionTo('REVIEWING'))
      expect(result.pass).toBe(false)
      expect(result).toMatchObject({ reason: expect.stringContaining('1 of 3') })
    })

    it('records feedback addressed with count', () => {
      const {
        result, state 
      } = spec
        .given(...eventsToAddressingFeedback())
        .when((wf) => wf.recordFeedbackAddressed(3))
      expect(result).toStrictEqual({ pass: true })
      expect(state.feedbackAddressed).toBe(true)
      expect(state.feedbackAddressedCount).toBe(3)
    })

    it('fails recordFeedbackAddressed in non-ADDRESSING_FEEDBACK states', () => {
      const { result } = spec.given().when((wf) => wf.recordFeedbackAddressed(1))
      expect(result.pass).toBe(false)
    })

    it('resets feedbackAddressed and feedbackClean on entry', () => {
      const { state } = spec.given(...eventsToAddressingFeedback()).when((wf) => wf.getState())
      expect(state.feedbackAddressed).toBe(false)
      expect(state.feedbackClean).toBe(false)
      expect(state.feedbackAddressedCount).toBeUndefined()
    })

    it('transitions to BLOCKED', () => {
      const {
        result, state 
      } = spec
        .given(...eventsToAddressingFeedback())
        .when((wf) => wf.transitionTo('BLOCKED'))
      expect(result).toStrictEqual({ pass: true })
      expect(state.preBlockedState).toBe('ADDRESSING_FEEDBACK')
    })
  })

  describe('REFLECTING state', () => {
    it('transitions to COMPLETE when reflection written', () => {
      const {
        result, state 
      } = spec
        .given(...eventsToReflecting(), reflectionWritten('/test-output/r.md'))
        .when((wf) => wf.transitionTo('COMPLETE'))
      expect(result).toStrictEqual({ pass: true })
      expect(state.currentStateMachineState).toBe('COMPLETE')
    })

    it('fails transition to COMPLETE when reflection not written', () => {
      const { result } = spec
        .given(...eventsToReflecting())
        .when((wf) => wf.transitionTo('COMPLETE'))
      expect(result.pass).toBe(false)
    })

    it('records reflection', () => {
      const {
        result, state 
      } = spec
        .given(...eventsToReflecting())
        .when((wf) => wf.recordReflection('/test-output/r.md'))
      expect(result).toStrictEqual({ pass: true })
      expect(state.reflectionPath).toBe('/test-output/r.md')
    })

    it('fails recordReflection in non-REFLECTING states', () => {
      const { result } = spec.given().when((wf) => wf.recordReflection('/test-output/r.md'))
      expect(result.pass).toBe(false)
    })

    it('transitions to BLOCKED', () => {
      const {
        result, state 
      } = spec
        .given(...eventsToReflecting())
        .when((wf) => wf.transitionTo('BLOCKED'))
      expect(result).toStrictEqual({ pass: true })
      expect(state.preBlockedState).toBe('REFLECTING')
    })
  })

  describe('COMPLETE state', () => {
    it('rejects all transitions', () => {
      const { result } = spec
        .given(...eventsToComplete())
        .when((wf) => wf.transitionTo('IMPLEMENTING'))
      expect(result.pass).toBe(false)
    })
  })

  describe('BLOCKED state', () => {
    it('returns to pre-blocked state', () => {
      const {
        result, state 
      } = spec
        .given(...eventsToCheckingFeedback(), transitioned('CHECKING_FEEDBACK', 'BLOCKED'))
        .when((wf) => wf.transitionTo('CHECKING_FEEDBACK'))
      expect(result).toStrictEqual({ pass: true })
      expect(state.currentStateMachineState).toBe('CHECKING_FEEDBACK')
      expect(state.preBlockedState).toBeUndefined()
    })

    it('fails transition to non-pre-blocked state', () => {
      const { result } = spec
        .given(...eventsToCheckingFeedback(), transitioned('CHECKING_FEEDBACK', 'BLOCKED'))
        .when((wf) => wf.transitionTo('IMPLEMENTING'))
      expect(result.pass).toBe(false)
    })
  })
})
