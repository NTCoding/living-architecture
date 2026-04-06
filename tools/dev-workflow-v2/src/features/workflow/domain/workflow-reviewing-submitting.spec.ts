import {
  spec,
  eventsToReviewing,
  eventsToSubmittingPr,
  eventsToAwaitingCi,
} from './fixtures/workflow-test-fixtures'

describe('Workflow', () => {
  describe('REVIEWING state', () => {
    it('records architecture review passed', () => {
      const {
        result, state, events 
      } = spec
        .given(...eventsToReviewing())
        .when((wf) => wf.executeRecording('record-architecture-review-passed'))
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
        .when((wf) => wf.executeRecording('record-architecture-review-failed'))
      expect(result).toStrictEqual({ pass: true })
      expect(state.architectureReviewPassed).toBe(false)
    })

    it('records code review passed', () => {
      const {
        result, state 
      } = spec
        .given(...eventsToReviewing())
        .when((wf) => wf.executeRecording('record-code-review-passed'))
      expect(result).toStrictEqual({ pass: true })
      expect(state.codeReviewPassed).toBe(true)
    })

    it('records code review failed', () => {
      const {
        result, state 
      } = spec
        .given(...eventsToReviewing())
        .when((wf) => wf.executeRecording('record-code-review-failed'))
      expect(result).toStrictEqual({ pass: true })
      expect(state.codeReviewPassed).toBe(false)
    })

    it('records bug scanner passed', () => {
      const {
        result, state 
      } = spec
        .given(...eventsToReviewing())
        .when((wf) => wf.executeRecording('record-bug-scanner-passed'))
      expect(result).toStrictEqual({ pass: true })
      expect(state.bugScannerPassed).toBe(true)
    })

    it('records bug scanner failed', () => {
      const {
        result, state 
      } = spec
        .given(...eventsToReviewing())
        .when((wf) => wf.executeRecording('record-bug-scanner-failed'))
      expect(result).toStrictEqual({ pass: true })
      expect(state.bugScannerPassed).toBe(false)
    })

    it('fails record-architecture-review-passed in non-REVIEWING states', () => {
      expect(
        spec.given().when((wf) => wf.executeRecording('record-architecture-review-passed')).result
          .pass,
      ).toBe(false)
    })

    it('fails record-code-review-passed in non-REVIEWING states', () => {
      expect(
        spec.given().when((wf) => wf.executeRecording('record-code-review-passed')).result.pass,
      ).toBe(false)
    })

    it('fails record-bug-scanner-passed in non-REVIEWING states', () => {
      expect(
        spec.given().when((wf) => wf.executeRecording('record-bug-scanner-passed')).result.pass,
      ).toBe(false)
    })

    it('fails record-architecture-review-failed in non-REVIEWING states', () => {
      expect(
        spec.given().when((wf) => wf.executeRecording('record-architecture-review-failed')).result
          .pass,
      ).toBe(false)
    })

    it('fails record-code-review-failed in non-REVIEWING states', () => {
      expect(
        spec.given().when((wf) => wf.executeRecording('record-code-review-failed')).result.pass,
      ).toBe(false)
    })

    it('fails record-bug-scanner-failed in non-REVIEWING states', () => {
      expect(
        spec.given().when((wf) => wf.executeRecording('record-bug-scanner-failed')).result.pass,
      ).toBe(false)
    })

    it('records task check passed', () => {
      const {
        result, state, events 
      } = spec
        .given(...eventsToReviewing())
        .when((wf) => wf.executeRecording('record-task-check-passed'))
      expect(result).toStrictEqual({ pass: true })
      expect(state.taskCheckPassed).toBe(true)
      expect(events).toStrictEqual(
        expect.arrayContaining([expect.objectContaining({ type: 'task-check-passed' })]),
      )
    })

    it('fails record-task-check-passed in non-REVIEWING states', () => {
      const { result } = spec.given().when((wf) => wf.executeRecording('record-task-check-passed'))
      expect(result.pass).toBe(false)
    })
  })

  describe('SUBMITTING_PR state', () => {
    it('records PR number with URL', () => {
      const {
        result, state, events 
      } = spec
        .given(...eventsToSubmittingPr())
        .when((wf) => wf.executeRecording('record-pr', 99, 'https://github.com/x/y/pull/99'))
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
        .when((wf) => wf.executeRecording('record-pr', 99))
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

    it('fails record-pr in non-SUBMITTING_PR states', () => {
      const { result } = spec.given().when((wf) => wf.executeRecording('record-pr', 1))
      expect(result.pass).toBe(false)
    })
  })

  describe('AWAITING_CI state', () => {
    it('records CI passed', () => {
      const {
        result, state 
      } = spec
        .given(...eventsToAwaitingCi())
        .when((wf) => wf.executeRecording('record-ci-passed'))
      expect(result).toStrictEqual({ pass: true })
      expect(state.ciPassed).toBe(true)
    })

    it('records CI failed', () => {
      const {
        result, state 
      } = spec
        .given(...eventsToAwaitingCi())
        .when((wf) => wf.executeRecording('record-ci-failed', 'test failures'))
      expect(result).toStrictEqual({ pass: true })
      expect(state.ciPassed).toBe(false)
    })

    it('fails record-ci-passed in non-AWAITING_CI states', () => {
      const { result } = spec.given().when((wf) => wf.executeRecording('record-ci-passed'))
      expect(result.pass).toBe(false)
    })

    it('fails record-ci-failed in non-AWAITING_CI states', () => {
      const { result } = spec.given().when((wf) => wf.executeRecording('record-ci-failed', 'err'))
      expect(result.pass).toBe(false)
    })
  })
})
