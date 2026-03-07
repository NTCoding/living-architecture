import { Workflow } from '../index'
import {
  spec,
  makeDeps,
  transitioned,
  eventsToReviewing,
  codeReviewFailed,
} from './fixtures/workflow-test-fixtures'

describe('Workflow', () => {
  describe('createFresh', () => {
    it('creates a workflow in IMPLEMENTING state with empty pending events', () => {
      const wf = Workflow.createFresh(makeDeps())
      expect(wf.getState().currentStateMachineState).toBe('IMPLEMENTING')
      expect(wf.getPendingEvents()).toHaveLength(0)
    })
  })

  describe('startSession', () => {
    it('appends session-started event with repository', () => {
      const { events } = spec.given().when((wf) => wf.startSession(undefined, 'owner/repo'))
      expect(events).toHaveLength(1)
      expect(events[0]).toMatchObject({
        type: 'session-started',
        repository: 'owner/repo',
      })
    })

    it('appends session-started event without repository when undefined', () => {
      const { events } = spec.given().when((wf) => wf.startSession(undefined, undefined))
      expect(events).toHaveLength(1)
      expect(events[0]).not.toHaveProperty('repository')
    })
  })

  describe('getAgentInstructions', () => {
    it('returns path from registry agentInstructions field', () => {
      const { result } = spec.given().when((wf) => wf.getAgentInstructions('/plugin'))
      expect(result).toBe('/plugin/states/implementing.md')
    })
  })

  describe('IMPLEMENTING state', () => {
    it('sets githubIssue when record-issue succeeds', () => {
      const {
        result, state, events 
      } = spec
        .given()
        .when((wf) => wf.executeRecording('record-issue', 42))
      expect(result).toStrictEqual({ pass: true })
      expect(state.githubIssue).toBe(42)
      expect(events).toStrictEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'issue-recorded',
            issueNumber: 42,
          }),
        ]),
      )
    })

    it('fails record-issue in non-IMPLEMENTING states', () => {
      const { result } = spec
        .given(...eventsToReviewing())
        .when((wf) => wf.executeRecording('record-issue', 42))
      expect(result.pass).toBe(false)
    })

    it('sets featureBranch when record-branch succeeds', () => {
      const {
        result, state, events 
      } = spec
        .given()
        .when((wf) => wf.executeRecording('record-branch', 'feature/x'))
      expect(result).toStrictEqual({ pass: true })
      expect(state.featureBranch).toBe('feature/x')
      expect(events).toStrictEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'branch-recorded',
            branch: 'feature/x',
          }),
        ]),
      )
    })

    it('fails record-branch in non-IMPLEMENTING states', () => {
      const { result } = spec
        .given(...eventsToReviewing())
        .when((wf) => wf.executeRecording('record-branch', 'feature/x'))
      expect(result.pass).toBe(false)
    })

    it('resets review flags on entry via stateOverrides in event', () => {
      const { state } = spec
        .given(
          ...eventsToReviewing(),
          codeReviewFailed(),
          transitioned('REVIEWING', 'IMPLEMENTING', {
            architectureReviewPassed: false,
            codeReviewPassed: false,
            bugScannerPassed: false,
            ciPassed: false,
            feedbackClean: false,
            feedbackAddressed: false,
          }),
        )
        .when((wf) => wf.getState())
      expect(state.architectureReviewPassed).toBe(false)
      expect(state.codeReviewPassed).toBe(false)
      expect(state.bugScannerPassed).toBe(false)
      expect(state.ciPassed).toBe(false)
    })

    it('resets feedback flags on entry via stateOverrides in event', () => {
      const { state } = spec
        .given(
          ...eventsToReviewing(),
          codeReviewFailed(),
          transitioned('REVIEWING', 'IMPLEMENTING', {
            architectureReviewPassed: false,
            codeReviewPassed: false,
            bugScannerPassed: false,
            ciPassed: false,
            feedbackClean: false,
            feedbackAddressed: false,
          }),
        )
        .when((wf) => wf.getState())
      expect(state.feedbackClean).toBe(false)
      expect(state.feedbackAddressed).toBe(false)
    })
  })
})
