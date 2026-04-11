import { Workflow } from './workflow'
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
      const { events } = spec.given().when((wf) => wf.startSession('', 'owner/repo'))
      expect(events).toHaveLength(1)
      expect(events[0]).toMatchObject({
        type: 'session-started',
        repository: 'owner/repo',
        transcriptPath: '',
      })
    })

    it('appends session-started event without repository when undefined', () => {
      const { events } = spec.given().when((wf) => wf.startSession('', undefined))
      expect(events).toHaveLength(1)
      expect(events[0]).not.toHaveProperty('repository')
      expect(events[0]).toHaveProperty('transcriptPath', '')
    })
  })

  describe('getAgentInstructions', () => {
    it('returns path from registry agentInstructions field', () => {
      const { result } = spec.given().when((wf) => wf.getAgentInstructions('/plugin'))
      expect(result).toBe('/plugin/states/implementing.md')
    })
  })

  describe('getTranscriptPath', () => {
    it('throws when session has not been started', () => {
      const wf = Workflow.createFresh(makeDeps())
      expect(() => wf.getTranscriptPath()).toThrow(
        'Transcript path not set. Session has not been started.',
      )
    })

    it('returns transcript path after session started', () => {
      const { result } = spec.given().when((wf) => {
        wf.startSession('some/path', undefined)
        return wf.getTranscriptPath()
      })
      expect(result).toBe('some/path')
    })
  })

  describe('registerAgent', () => {
    it('returns pass (no-op for single-agent workflow)', () => {
      const {
        result, events 
      } = spec.given().when((wf) => wf.registerAgent('lead', 'agent-1'))
      expect(result).toStrictEqual({ pass: true })
      expect(events).toHaveLength(0)
    })
  })

  describe('handleTeammateIdle', () => {
    it('returns pass (no-op for single-agent workflow)', () => {
      const {
        result, events 
      } = spec.given().when((wf) => wf.handleTeammateIdle('agent-1'))
      expect(result).toStrictEqual({ pass: true })
      expect(events).toHaveLength(0)
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
