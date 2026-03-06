import {
  spec,
  architectureReviewPassed,
  codeReviewPassed,
  codeReviewFailed,
  allReviewsPassed,
  prRecorded,
  ciPassed,
  ciFailed,
  eventsToReviewing,
  eventsToSubmittingPr,
  eventsToAwaitingCi,
} from './fixtures/workflow-test-fixtures'

describe('Workflow', () => {
  describe('REVIEWING state', () => {
    it('transitions to SUBMITTING_PR when all reviews passed', () => {
      const {
        result, state 
      } = spec
        .given(...eventsToReviewing(), ...allReviewsPassed())
        .when((wf) => wf.transitionTo('SUBMITTING_PR'))
      expect(result).toStrictEqual({ pass: true })
      expect(state.currentStateMachineState).toBe('SUBMITTING_PR')
    })

    it('fails transition to SUBMITTING_PR when not all reviews passed', () => {
      const { result } = spec
        .given(...eventsToReviewing(), architectureReviewPassed(), codeReviewPassed())
        .when((wf) => wf.transitionTo('SUBMITTING_PR'))
      expect(result.pass).toBe(false)
    })

    it('fails transition to SUBMITTING_PR when no reviews recorded', () => {
      const { result } = spec
        .given(...eventsToReviewing())
        .when((wf) => wf.transitionTo('SUBMITTING_PR'))
      expect(result.pass).toBe(false)
    })

    it('transitions to IMPLEMENTING when a review failed', () => {
      const {
        result, state 
      } = spec
        .given(...eventsToReviewing(), codeReviewFailed())
        .when((wf) => wf.transitionTo('IMPLEMENTING'))
      expect(result).toStrictEqual({ pass: true })
      expect(state.currentStateMachineState).toBe('IMPLEMENTING')
    })

    it('fails transition to IMPLEMENTING when all reviews passed', () => {
      const { result } = spec
        .given(...eventsToReviewing(), ...allReviewsPassed())
        .when((wf) => wf.transitionTo('IMPLEMENTING'))
      expect(result.pass).toBe(false)
    })

    it('records architecture review passed', () => {
      const {
        result, state, events 
      } = spec
        .given(...eventsToReviewing())
        .when((wf) => wf.recordArchitectureReviewPassed())
      expect(result).toStrictEqual({ pass: true })
      expect(state.architectureReviewPassed).toBe(true)
      expect(events).toStrictEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'architecture-review-completed',
            passed: true,
          }),
        ]),
      )
    })

    it('records architecture review failed', () => {
      const {
        result, state 
      } = spec
        .given(...eventsToReviewing())
        .when((wf) => wf.recordArchitectureReviewFailed())
      expect(result).toStrictEqual({ pass: true })
      expect(state.architectureReviewPassed).toBe(false)
    })

    it('records code review passed', () => {
      const {
        result, state 
      } = spec
        .given(...eventsToReviewing())
        .when((wf) => wf.recordCodeReviewPassed())
      expect(result).toStrictEqual({ pass: true })
      expect(state.codeReviewPassed).toBe(true)
    })

    it('records code review failed', () => {
      const {
        result, state 
      } = spec
        .given(...eventsToReviewing())
        .when((wf) => wf.recordCodeReviewFailed())
      expect(result).toStrictEqual({ pass: true })
      expect(state.codeReviewPassed).toBe(false)
    })

    it('records bug scanner passed', () => {
      const {
        result, state 
      } = spec
        .given(...eventsToReviewing())
        .when((wf) => wf.recordBugScannerPassed())
      expect(result).toStrictEqual({ pass: true })
      expect(state.bugScannerPassed).toBe(true)
    })

    it('records bug scanner failed', () => {
      const {
        result, state 
      } = spec
        .given(...eventsToReviewing())
        .when((wf) => wf.recordBugScannerFailed())
      expect(result).toStrictEqual({ pass: true })
      expect(state.bugScannerPassed).toBe(false)
    })

    it('fails recordArchitectureReviewPassed in non-REVIEWING states', () => {
      expect(spec.given().when((wf) => wf.recordArchitectureReviewPassed()).result.pass).toBe(false)
    })

    it('fails recordCodeReviewPassed in non-REVIEWING states', () => {
      expect(spec.given().when((wf) => wf.recordCodeReviewPassed()).result.pass).toBe(false)
    })

    it('fails recordBugScannerPassed in non-REVIEWING states', () => {
      expect(spec.given().when((wf) => wf.recordBugScannerPassed()).result.pass).toBe(false)
    })

    it('fails recordArchitectureReviewFailed in non-REVIEWING states', () => {
      expect(spec.given().when((wf) => wf.recordArchitectureReviewFailed()).result.pass).toBe(false)
    })

    it('fails recordCodeReviewFailed in non-REVIEWING states', () => {
      expect(spec.given().when((wf) => wf.recordCodeReviewFailed()).result.pass).toBe(false)
    })

    it('fails recordBugScannerFailed in non-REVIEWING states', () => {
      expect(spec.given().when((wf) => wf.recordBugScannerFailed()).result.pass).toBe(false)
    })

    it('records task check passed', () => {
      const {
        result, state, events 
      } = spec
        .given(...eventsToReviewing())
        .when((wf) => wf.recordTaskCheckPassed())
      expect(result).toStrictEqual({ pass: true })
      expect(state.taskCheckPassed).toBe(true)
      expect(events).toStrictEqual(
        expect.arrayContaining([expect.objectContaining({ type: 'task-check-passed' })]),
      )
    })

    it('fails recordTaskCheckPassed in non-REVIEWING states', () => {
      const { result } = spec.given().when((wf) => wf.recordTaskCheckPassed())
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
