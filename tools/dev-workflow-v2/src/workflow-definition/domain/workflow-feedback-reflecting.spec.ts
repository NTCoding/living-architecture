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
} from './fixtures/workflow-test-fixtures'

describe('Workflow', () => {
  describe('CHECKING_FEEDBACK state', () => {
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

    it('records feedback exists', () => {
      const {
        result, state 
      } = spec
        .given(...eventsToCheckingFeedback())
        .when((wf) => wf.recordFeedbackExists(3))
      expect(result).toStrictEqual({ pass: true })
      expect(state.feedbackClean).toBe(false)
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
    it('transitions to VERIFYING when feedback addressed', () => {
      const {
        result, state 
      } = spec
        .given(...eventsToAddressingFeedback(), feedbackAddressed())
        .when((wf) => wf.transitionTo('VERIFYING'))
      expect(result).toStrictEqual({ pass: true })
      expect(state.currentStateMachineState).toBe('VERIFYING')
    })

    it('fails transition to VERIFYING when feedback not addressed', () => {
      const { result } = spec
        .given(...eventsToAddressingFeedback())
        .when((wf) => wf.transitionTo('VERIFYING'))
      expect(result.pass).toBe(false)
    })

    it('records feedback addressed', () => {
      const {
        result, state 
      } = spec
        .given(...eventsToAddressingFeedback())
        .when((wf) => wf.recordFeedbackAddressed())
      expect(result).toStrictEqual({ pass: true })
      expect(state.feedbackAddressed).toBe(true)
    })

    it('fails recordFeedbackAddressed in non-ADDRESSING_FEEDBACK states', () => {
      const { result } = spec.given().when((wf) => wf.recordFeedbackAddressed())
      expect(result.pass).toBe(false)
    })

    it('resets feedbackAddressed and feedbackClean on entry', () => {
      const { state } = spec.given(...eventsToAddressingFeedback()).when((wf) => wf.getState())
      expect(state.feedbackAddressed).toBe(false)
      expect(state.feedbackClean).toBe(false)
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
