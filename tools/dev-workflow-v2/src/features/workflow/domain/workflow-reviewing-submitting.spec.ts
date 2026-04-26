import { WorkflowStateError } from '@nt-ai-lab/deterministic-agent-workflow-engine'
import {
  spec,
  eventsToReviewing,
  eventsToSubmittingPr,
  eventsToAwaitingCi,
  makeDeps,
  reviewRecorded,
} from './fixtures/workflow-test-fixtures'
import { Workflow } from './workflow'
import { applyEvents } from './fold'
import { reviewingState } from './states/reviewing'

function getReviewingTransitionGuard(): NonNullable<typeof reviewingState.transitionGuard> {
  const transitionGuard = reviewingState.transitionGuard
  if (transitionGuard === undefined) {
    throw new WorkflowStateError('Expected REVIEWING state to define a transition guard.')
  }
  return transitionGuard
}

describe('Workflow', () => {
  describe('REVIEWING state', () => {
    it('marks architecture review as passed when latest architecture review verdict passed', () => {
      const workflow = Workflow.rehydrate(applyEvents(eventsToReviewing()), makeDeps())
      workflow.appendEvent(reviewRecorded('architecture-review', 'PASS'))

      expect(workflow.getState().architectureReviewPassed).toBe(true)
    })

    it('marks architecture review as failed when latest architecture review verdict failed', () => {
      const workflow = Workflow.rehydrate(applyEvents(eventsToReviewing()), makeDeps())
      workflow.appendEvent(reviewRecorded('architecture-review', 'PASS'))
      workflow.appendEvent(reviewRecorded('architecture-review', 'FAIL'))

      expect(workflow.getState().architectureReviewPassed).toBe(false)
    })

    it('marks code review as passed when latest code review verdict passed', () => {
      const workflow = Workflow.rehydrate(applyEvents(eventsToReviewing()), makeDeps())
      workflow.appendEvent(reviewRecorded('code-review', 'PASS'))

      expect(workflow.getState().codeReviewPassed).toBe(true)
    })

    it('marks bug scanner as failed when latest bug scanner verdict failed', () => {
      const workflow = Workflow.rehydrate(applyEvents(eventsToReviewing()), makeDeps())
      workflow.appendEvent(reviewRecorded('bug-scanner', 'FAIL'))

      expect(workflow.getState().bugScannerPassed).toBe(false)
    })

    it('marks task check as passed when latest task check verdict passed', () => {
      const workflow = Workflow.rehydrate(applyEvents(eventsToReviewing()), makeDeps())
      workflow.appendEvent(reviewRecorded('task-check', 'PASS'))

      expect(workflow.getState().taskCheckPassed).toBe(true)
    })

    it('uses the latest task check review attempt when multiple attempts exist', () => {
      const workflow = Workflow.rehydrate(applyEvents(eventsToReviewing()), makeDeps())
      workflow.appendEvent(reviewRecorded('task-check', 'FAIL'))
      workflow.appendEvent(reviewRecorded('task-check', 'PASS'))

      expect(workflow.getState().taskCheckPassed).toBe(true)
    })

    it('rejects SUBMITTING_PR without task check when no issue is recorded and required reviews failed', () => {
      const result = getReviewingTransitionGuard()({
        state: {
          ...Workflow.createFresh(makeDeps()).getState(),
          currentStateMachineState: 'REVIEWING',
          architectureReviewPassed: false,
          codeReviewPassed: false,
          bugScannerPassed: false,
        },
        gitInfo: makeDeps().getGitInfo(),
        from: 'REVIEWING',
        to: 'SUBMITTING_PR',
      })

      expect(result).toStrictEqual({
        pass: false,
        reason:
          'Not all reviews passed. Each of architecture-review, code-review, and bug-scanner must pass.',
      })
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
