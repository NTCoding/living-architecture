import { Workflow } from '../index'
import {
  spec,
  makeDeps,
  gitWithCommits,
  issueRecorded,
  branchRecorded,
  transitioned,
  verifyPassed,
  verifyFailed,
  eventsToVerifying,
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
    it('transitions to VERIFYING when hasCommitsVsDefault', () => {
      const {
        result, state 
      } = spec
        .given(issueRecorded(1), branchRecorded('issue-1'))
        .withDeps({ getGitInfo: () => gitWithCommits })
        .when((wf) => wf.transitionTo('VERIFYING'))
      expect(result).toStrictEqual({ pass: true })
      expect(state.currentStateMachineState).toBe('VERIFYING')
    })

    it('fails transition to VERIFYING when no commits', () => {
      const { result } = spec.given(issueRecorded(1)).when((wf) => wf.transitionTo('VERIFYING'))
      expect(result.pass).toBe(false)
    })

    it('transitions to BLOCKED', () => {
      const {
        result, state 
      } = spec.given().when((wf) => wf.transitionTo('BLOCKED'))
      expect(result).toStrictEqual({ pass: true })
      expect(state.currentStateMachineState).toBe('BLOCKED')
    })

    it('fails transition to non-VERIFYING/BLOCKED states', () => {
      const { result } = spec
        .given()
        .withDeps({ getGitInfo: () => gitWithCommits })
        .when((wf) => wf.transitionTo('REVIEWING'))
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
      const { result } = spec.given(...eventsToVerifying()).when((wf) => wf.recordIssue(42))
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
        .given(...eventsToVerifying())
        .when((wf) => wf.recordBranch('feature/x'))
      expect(result.pass).toBe(false)
    })

    it('resets verify and review flags on entry', () => {
      const { state } = spec
        .given(...eventsToVerifying(), verifyFailed(), transitioned('VERIFYING', 'IMPLEMENTING'))
        .when((wf) => wf.getState())
      expect(state.verifyPassed).toBe(false)
      expect(state.reviewPassed).toBe(false)
      expect(state.ciPassed).toBe(false)
    })

    it('resets feedback flags on entry', () => {
      const { state } = spec
        .given(...eventsToVerifying(), verifyFailed(), transitioned('VERIFYING', 'IMPLEMENTING'))
        .when((wf) => wf.getState())
      expect(state.feedbackClean).toBe(false)
      expect(state.feedbackAddressed).toBe(false)
    })
  })

  describe('VERIFYING state', () => {
    it('transitions to REVIEWING when verify passed', () => {
      const {
        result, state 
      } = spec
        .given(...eventsToVerifying(), verifyPassed())
        .when((wf) => wf.transitionTo('REVIEWING'))
      expect(result).toStrictEqual({ pass: true })
      expect(state.currentStateMachineState).toBe('REVIEWING')
    })

    it('fails transition to REVIEWING when verify not passed', () => {
      const { result } = spec
        .given(...eventsToVerifying())
        .when((wf) => wf.transitionTo('REVIEWING'))
      expect(result.pass).toBe(false)
    })

    it('transitions to IMPLEMENTING when verify failed', () => {
      const {
        result, state 
      } = spec
        .given(...eventsToVerifying(), verifyFailed())
        .when((wf) => wf.transitionTo('IMPLEMENTING'))
      expect(result).toStrictEqual({ pass: true })
      expect(state.currentStateMachineState).toBe('IMPLEMENTING')
    })

    it('fails transition to IMPLEMENTING when verify passed', () => {
      const { result } = spec
        .given(...eventsToVerifying(), verifyPassed())
        .when((wf) => wf.transitionTo('IMPLEMENTING'))
      expect(result.pass).toBe(false)
    })

    it('records verify passed', () => {
      const {
        result, state, events 
      } = spec
        .given(...eventsToVerifying())
        .when((wf) => wf.recordVerifyPassed())
      expect(result).toStrictEqual({ pass: true })
      expect(state.verifyPassed).toBe(true)
      expect(events).toStrictEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'verify-completed',
            passed: true,
          }),
        ]),
      )
    })

    it('records verify failed', () => {
      const {
        result, state, events 
      } = spec
        .given(...eventsToVerifying())
        .when((wf) => wf.recordVerifyFailed('lint errors'))
      expect(result).toStrictEqual({ pass: true })
      expect(state.verifyPassed).toBe(false)
      expect(events).toStrictEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'verify-completed',
            passed: false,
            output: 'lint errors',
          }),
        ]),
      )
    })

    it('fails recordVerifyPassed in non-VERIFYING states', () => {
      const { result } = spec.given().when((wf) => wf.recordVerifyPassed())
      expect(result.pass).toBe(false)
    })

    it('fails recordVerifyFailed in non-VERIFYING states', () => {
      const { result } = spec.given().when((wf) => wf.recordVerifyFailed('err'))
      expect(result.pass).toBe(false)
    })

    it('transitions to BLOCKED', () => {
      const {
        result, state 
      } = spec
        .given(...eventsToVerifying())
        .when((wf) => wf.transitionTo('BLOCKED'))
      expect(result).toStrictEqual({ pass: true })
      expect(state.currentStateMachineState).toBe('BLOCKED')
      expect(state.preBlockedState).toBe('VERIFYING')
    })
  })
})
