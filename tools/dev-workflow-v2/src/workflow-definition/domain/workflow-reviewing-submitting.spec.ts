import {
  spec,
  reviewPassed,
  reviewFailed,
  prRecorded,
  ciPassed,
  ciFailed,
  eventsToReviewing,
  eventsToSubmittingPr,
  eventsToAwaitingCi,
} from './workflow-test-fixtures'

describe('Workflow', () => {
  describe('REVIEWING state', () => {
    it('transitions to SUBMITTING_PR when review passed', () => {
      const {
        result, state 
      } = spec
        .given(...eventsToReviewing(), reviewPassed())
        .when((wf) => wf.transitionTo('SUBMITTING_PR'))
      expect(result).toStrictEqual({ pass: true })
      expect(state.currentStateMachineState).toBe('SUBMITTING_PR')
    })

    it('fails transition to SUBMITTING_PR when review not passed', () => {
      const { result } = spec
        .given(...eventsToReviewing())
        .when((wf) => wf.transitionTo('SUBMITTING_PR'))
      expect(result.pass).toBe(false)
    })

    it('transitions to IMPLEMENTING when review failed', () => {
      const {
        result, state 
      } = spec
        .given(...eventsToReviewing(), reviewFailed())
        .when((wf) => wf.transitionTo('IMPLEMENTING'))
      expect(result).toStrictEqual({ pass: true })
      expect(state.currentStateMachineState).toBe('IMPLEMENTING')
    })

    it('fails transition to IMPLEMENTING when review passed', () => {
      const { result } = spec
        .given(...eventsToReviewing(), reviewPassed())
        .when((wf) => wf.transitionTo('IMPLEMENTING'))
      expect(result.pass).toBe(false)
    })

    it('records review passed', () => {
      const {
        result, state, events 
      } = spec
        .given(...eventsToReviewing())
        .when((wf) => wf.recordReviewPassed())
      expect(result).toStrictEqual({ pass: true })
      expect(state.reviewPassed).toBe(true)
      expect(events).toStrictEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'review-completed',
            passed: true,
          }),
        ]),
      )
    })

    it('records review failed', () => {
      const {
        result, state, events 
      } = spec
        .given(...eventsToReviewing())
        .when((wf) => wf.recordReviewFailed(['code-review']))
      expect(result).toStrictEqual({ pass: true })
      expect(state.reviewPassed).toBe(false)
      expect(events).toStrictEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'review-completed',
            passed: false,
          }),
        ]),
      )
    })

    it('fails recordReviewPassed in non-REVIEWING states', () => {
      const { result } = spec.given().when((wf) => wf.recordReviewPassed())
      expect(result.pass).toBe(false)
    })

    it('fails recordReviewFailed in non-REVIEWING states', () => {
      const { result } = spec.given().when((wf) => wf.recordReviewFailed(['x']))
      expect(result.pass).toBe(false)
    })

    it('transitions to BLOCKED', () => {
      const {
        result, state 
      } = spec
        .given(...eventsToReviewing())
        .when((wf) => wf.transitionTo('BLOCKED'))
      expect(result).toStrictEqual({ pass: true })
      expect(state.preBlockedState).toBe('REVIEWING')
    })
  })

  describe('SUBMITTING_PR state', () => {
    it('transitions to AWAITING_CI when prNumber set', () => {
      const {
        result, state 
      } = spec
        .given(...eventsToSubmittingPr(), prRecorded(99))
        .when((wf) => wf.transitionTo('AWAITING_CI'))
      expect(result).toStrictEqual({ pass: true })
      expect(state.currentStateMachineState).toBe('AWAITING_CI')
    })

    it('fails transition to AWAITING_CI when prNumber not set', () => {
      const { result } = spec
        .given(...eventsToSubmittingPr())
        .when((wf) => wf.transitionTo('AWAITING_CI'))
      expect(result.pass).toBe(false)
    })

    it('records PR number with URL', () => {
      const {
        result, state, events 
      } = spec
        .given(...eventsToSubmittingPr())
        .when((wf) => wf.recordPr(99, 'https://github.com/x/y/pull/99'))
      expect(result).toStrictEqual({ pass: true })
      expect(state.prNumber).toBe(99)
      expect(state.prUrl).toBe('https://github.com/x/y/pull/99')
      expect(events).toStrictEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'pr-recorded',
            prNumber: 99,
          }),
        ]),
      )
    })

    it('records PR number without URL', () => {
      const {
        result, state, events 
      } = spec
        .given(...eventsToSubmittingPr())
        .when((wf) => wf.recordPr(99))
      expect(result).toStrictEqual({ pass: true })
      expect(state.prNumber).toBe(99)
      expect(state.prUrl).toBeUndefined()
      expect(events).toStrictEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'pr-recorded',
            prNumber: 99,
          }),
        ]),
      )
    })

    it('fails recordPr in non-SUBMITTING_PR states', () => {
      const { result } = spec.given().when((wf) => wf.recordPr(1))
      expect(result.pass).toBe(false)
    })

    it('transitions to BLOCKED', () => {
      const {
        result, state 
      } = spec
        .given(...eventsToSubmittingPr())
        .when((wf) => wf.transitionTo('BLOCKED'))
      expect(result).toStrictEqual({ pass: true })
      expect(state.preBlockedState).toBe('SUBMITTING_PR')
    })
  })

  describe('AWAITING_CI state', () => {
    it('transitions to CHECKING_FEEDBACK when CI passed', () => {
      const {
        result, state 
      } = spec
        .given(...eventsToAwaitingCi(), ciPassed())
        .when((wf) => wf.transitionTo('CHECKING_FEEDBACK'))
      expect(result).toStrictEqual({ pass: true })
      expect(state.currentStateMachineState).toBe('CHECKING_FEEDBACK')
    })

    it('fails transition to CHECKING_FEEDBACK when CI not passed', () => {
      const { result } = spec
        .given(...eventsToAwaitingCi())
        .when((wf) => wf.transitionTo('CHECKING_FEEDBACK'))
      expect(result.pass).toBe(false)
    })

    it('transitions to IMPLEMENTING when CI failed', () => {
      const {
        result, state 
      } = spec
        .given(...eventsToAwaitingCi(), ciFailed())
        .when((wf) => wf.transitionTo('IMPLEMENTING'))
      expect(result).toStrictEqual({ pass: true })
      expect(state.currentStateMachineState).toBe('IMPLEMENTING')
    })

    it('fails transition to IMPLEMENTING when CI passed', () => {
      const { result } = spec
        .given(...eventsToAwaitingCi(), ciPassed())
        .when((wf) => wf.transitionTo('IMPLEMENTING'))
      expect(result.pass).toBe(false)
    })

    it('records CI passed', () => {
      const {
        result, state 
      } = spec
        .given(...eventsToAwaitingCi())
        .when((wf) => wf.recordCiPassed())
      expect(result).toStrictEqual({ pass: true })
      expect(state.ciPassed).toBe(true)
    })

    it('records CI failed', () => {
      const {
        result, state 
      } = spec
        .given(...eventsToAwaitingCi())
        .when((wf) => wf.recordCiFailed('test failures'))
      expect(result).toStrictEqual({ pass: true })
      expect(state.ciPassed).toBe(false)
    })

    it('fails recordCiPassed in non-AWAITING_CI states', () => {
      const { result } = spec.given().when((wf) => wf.recordCiPassed())
      expect(result.pass).toBe(false)
    })

    it('fails recordCiFailed in non-AWAITING_CI states', () => {
      const { result } = spec.given().when((wf) => wf.recordCiFailed('err'))
      expect(result.pass).toBe(false)
    })

    it('transitions to BLOCKED', () => {
      const {
        result, state 
      } = spec
        .given(...eventsToAwaitingCi())
        .when((wf) => wf.transitionTo('BLOCKED'))
      expect(result).toStrictEqual({ pass: true })
      expect(state.preBlockedState).toBe('AWAITING_CI')
    })
  })
})
