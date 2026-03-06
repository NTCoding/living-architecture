import { Workflow } from '../index'
import {
  spec,
  makeDeps,
  gitWithCommits,
  gitWithDirtyTree,
  issueRecorded,
  branchRecorded,
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
      const { events } = spec.given().when((wf) => wf.startSession('owner/repo'))
      expect(events).toHaveLength(1)
      expect(events[0]).toMatchObject({
        type: 'session-started',
        repository: 'owner/repo',
      })
    })

    it('appends session-started event without repository when undefined', () => {
      const { events } = spec.given().when((wf) => wf.startSession(undefined))
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
    it('transitions to REVIEWING when all guards pass', () => {
      const {
        result, state 
      } = spec
        .given(issueRecorded(1), branchRecorded('issue-1'))
        .withDeps({ getGitInfo: () => gitWithCommits })
        .when((wf) => wf.transitionTo('REVIEWING'))
      expect(result).toStrictEqual({ pass: true })
      expect(state.currentStateMachineState).toBe('REVIEWING')
    })

    it('fails transition to REVIEWING when no commits', () => {
      const { result } = spec.given(issueRecorded(1)).when((wf) => wf.transitionTo('REVIEWING'))
      expect(result.pass).toBe(false)
    })

    it('fails transition to REVIEWING when working tree is dirty', () => {
      const { result } = spec
        .given(issueRecorded(1))
        .withDeps({ getGitInfo: () => gitWithDirtyTree })
        .when((wf) => wf.transitionTo('REVIEWING'))
      expect(result.pass).toBe(false)
      expect(result).toMatchObject({ reason: expect.stringContaining('Working tree is not clean') })
    })

    it('fails transition to REVIEWING when no issue recorded', () => {
      const { result } = spec
        .given(branchRecorded('issue-1'))
        .withDeps({ getGitInfo: () => gitWithCommits })
        .when((wf) => wf.transitionTo('REVIEWING'))
      expect(result.pass).toBe(false)
      expect(result).toMatchObject({ reason: expect.stringContaining('No issue recorded') })
    })

    it('transitions to BLOCKED', () => {
      const {
        result, state 
      } = spec.given().when((wf) => wf.transitionTo('BLOCKED'))
      expect(result).toStrictEqual({ pass: true })
      expect(state.currentStateMachineState).toBe('BLOCKED')
    })

    it('fails transition to non-REVIEWING/BLOCKED states', () => {
      const { result } = spec
        .given()
        .withDeps({ getGitInfo: () => gitWithCommits })
        .when((wf) => wf.transitionTo('SUBMITTING_PR'))
      expect(result.pass).toBe(false)
    })

    it('sets githubIssue when recordIssue succeeds', () => {
      const {
        result, state, events 
      } = spec.given().when((wf) => wf.recordIssue(42))
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

    it('fails recordIssue in non-IMPLEMENTING states', () => {
      const { result } = spec.given(...eventsToReviewing()).when((wf) => wf.recordIssue(42))
      expect(result.pass).toBe(false)
    })

    it('sets featureBranch when recordBranch succeeds', () => {
      const {
        result, state, events 
      } = spec.given().when((wf) => wf.recordBranch('feature/x'))
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

    it('fails recordBranch in non-IMPLEMENTING states', () => {
      const { result } = spec
        .given(...eventsToReviewing())
        .when((wf) => wf.recordBranch('feature/x'))
      expect(result.pass).toBe(false)
    })

    it('resets review flags on entry', () => {
      const { state } = spec
        .given(
          ...eventsToReviewing(),
          codeReviewFailed(),
          transitioned('REVIEWING', 'IMPLEMENTING'),
        )
        .when((wf) => wf.getState())
      expect(state.architectureReviewPassed).toBe(false)
      expect(state.codeReviewPassed).toBe(false)
      expect(state.bugScannerPassed).toBe(false)
      expect(state.ciPassed).toBe(false)
    })

    it('resets feedback flags on entry', () => {
      const { state } = spec
        .given(
          ...eventsToReviewing(),
          codeReviewFailed(),
          transitioned('REVIEWING', 'IMPLEMENTING'),
        )
        .when((wf) => wf.getState())
      expect(state.feedbackClean).toBe(false)
      expect(state.feedbackAddressed).toBe(false)
    })
  })
})
