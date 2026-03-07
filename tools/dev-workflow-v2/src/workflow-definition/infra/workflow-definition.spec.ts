import { WORKFLOW_DEFINITION } from './workflow-definition'
import type { WorkflowDeps } from '../domain/workflow'
import type { BaseEvent } from '@ntcoding/agentic-workflow-builder/engine'
import { WorkflowStateError } from '@ntcoding/agentic-workflow-builder/engine'
import type {
  WorkflowState, StateName 
} from '../domain/workflow-types'

function makeWorkflowDeps(): WorkflowDeps {
  return {
    getGitInfo: () => ({
      currentBranch: 'main',
      workingTreeClean: true,
      headCommit: 'abc123',
      changedFilesVsDefault: [],
      hasCommitsVsDefault: false,
    }),
    checkPrChecks: () => true,
    getPrFeedback: () => ({
      unresolvedCount: 0,
      threads: [],
    }),
    now: () => '2026-01-01T00:00:00Z',
  }
}

function buildTransitionEvent(
  from: StateName,
  to: StateName,
  stateBefore: WorkflowState,
  stateAfter: WorkflowState,
  now: string,
): BaseEvent {
  const fn = WORKFLOW_DEFINITION.buildTransitionEvent
  if (fn === undefined) throw new WorkflowStateError('buildTransitionEvent not defined')
  return fn(from, to, stateBefore, stateAfter, now)
}

describe('WORKFLOW_DEFINITION', () => {
  it('creates a fresh Workflow with IMPLEMENTING state', () => {
    const workflow = WORKFLOW_DEFINITION.createFresh(makeWorkflowDeps())
    expect(workflow.getState().currentStateMachineState).toStrictEqual('IMPLEMENTING')
  })

  it('rehydrates a Workflow from empty events', () => {
    const events: readonly BaseEvent[] = []
    const workflow = WORKFLOW_DEFINITION.rehydrate(events, makeWorkflowDeps())
    expect(workflow.getState().currentStateMachineState).toStrictEqual('IMPLEMENTING')
  })

  it('rehydrates a Workflow from valid events', () => {
    const events: readonly (BaseEvent & Record<string, unknown>)[] = [
      {
        type: 'issue-recorded',
        at: '2026-01-01T00:00:00Z',
        issueNumber: 42,
      },
    ]
    const workflow = WORKFLOW_DEFINITION.rehydrate(events, makeWorkflowDeps())
    expect(workflow.getState().githubIssue).toStrictEqual(42)
  })

  it('throws WorkflowStateError on unknown event types', () => {
    const events: readonly BaseEvent[] = [
      {
        type: 'unknown-event',
        at: '2026-01-01T00:00:00Z',
      },
    ]
    expect(() => WORKFLOW_DEFINITION.rehydrate(events, makeWorkflowDeps())).toThrow(
      'Unknown event type in store',
    )
  })

  it('returns procedure path for a given state', () => {
    const path = WORKFLOW_DEFINITION.procedurePath('IMPLEMENTING', '/plugin')
    expect(path).toContain('implementing')
    expect(path).toContain('/plugin/')
  })

  it('returns initial state with IMPLEMENTING', () => {
    const initial = WORKFLOW_DEFINITION.initialState()
    expect(initial.currentStateMachineState).toStrictEqual('IMPLEMENTING')
  })

  describe('getRegistry', () => {
    it('returns the workflow registry', () => {
      const registry = WORKFLOW_DEFINITION.getRegistry()
      expect(registry.IMPLEMENTING).toBeDefined()
      expect(registry.REVIEWING).toBeDefined()
      expect(registry.COMPLETE).toBeDefined()
    })
  })

  describe('buildTransitionContext', () => {
    it('builds context with state and transition info', () => {
      const state: WorkflowState = {
        currentStateMachineState: 'IMPLEMENTING',
        architectureReviewPassed: false,
        codeReviewPassed: false,
        bugScannerPassed: false,
        taskCheckPassed: false,
        ciPassed: false,
        feedbackClean: false,
        feedbackAddressed: false,
        prNumber: 42,
      }
      const deps = makeWorkflowDeps()
      const ctx = WORKFLOW_DEFINITION.buildTransitionContext(
        state,
        'IMPLEMENTING',
        'REVIEWING',
        deps,
      )
      expect(ctx.state).toBe(state)
      expect(ctx.from).toStrictEqual('IMPLEMENTING')
      expect(ctx.to).toStrictEqual('REVIEWING')
    })

    it('sets prChecksPass from deps when prNumber exists', () => {
      const state: WorkflowState = {
        currentStateMachineState: 'IMPLEMENTING',
        architectureReviewPassed: false,
        codeReviewPassed: false,
        bugScannerPassed: false,
        taskCheckPassed: false,
        ciPassed: false,
        feedbackClean: false,
        feedbackAddressed: false,
        prNumber: 42,
      }
      const deps = makeWorkflowDeps()
      const ctx = WORKFLOW_DEFINITION.buildTransitionContext(
        state,
        'IMPLEMENTING',
        'REVIEWING',
        deps,
      )
      expect(ctx.prChecksPass).toStrictEqual(true)
    })

    it('sets prChecksPass to false when no prNumber', () => {
      const state: WorkflowState = {
        currentStateMachineState: 'IMPLEMENTING',
        architectureReviewPassed: false,
        codeReviewPassed: false,
        bugScannerPassed: false,
        taskCheckPassed: false,
        ciPassed: false,
        feedbackClean: false,
        feedbackAddressed: false,
      }
      const deps = makeWorkflowDeps()
      const ctx = WORKFLOW_DEFINITION.buildTransitionContext(
        state,
        'IMPLEMENTING',
        'REVIEWING',
        deps,
      )
      expect(ctx.prChecksPass).toStrictEqual(false)
    })
  })

  describe('buildTransitionEvent', () => {
    const baseBefore: WorkflowState = {
      currentStateMachineState: 'IMPLEMENTING',
      architectureReviewPassed: true,
      codeReviewPassed: true,
      bugScannerPassed: true,
      taskCheckPassed: false,
      ciPassed: true,
      feedbackClean: true,
      feedbackAddressed: true,
    }

    it('produces event without stateOverrides when no state changes', () => {
      const event = buildTransitionEvent(
        'IMPLEMENTING',
        'REVIEWING',
        baseBefore,
        baseBefore,
        '2026-01-01T00:00:00Z',
      )
      expect(event).toStrictEqual({
        type: 'transitioned',
        at: '2026-01-01T00:00:00Z',
        from: 'IMPLEMENTING',
        to: 'REVIEWING',
      })
    })

    it('produces event with stateOverrides when onEntry mutates state', () => {
      const stateAfter: WorkflowState = {
        ...baseBefore,
        architectureReviewPassed: false,
        codeReviewPassed: false,
        bugScannerPassed: false,
        ciPassed: false,
        feedbackClean: false,
        feedbackAddressed: false,
      }
      const event = buildTransitionEvent(
        'REVIEWING',
        'IMPLEMENTING',
        baseBefore,
        stateAfter,
        '2026-01-01T00:00:00Z',
      )
      expect(event).toHaveProperty('stateOverrides', {
        architectureReviewPassed: false,
        codeReviewPassed: false,
        bugScannerPassed: false,
        ciPassed: false,
        feedbackClean: false,
        feedbackAddressed: false,
      })
    })

    it('does not include currentStateMachineState in stateOverrides', () => {
      const stateAfter: WorkflowState = {
        ...baseBefore,
        currentStateMachineState: 'REVIEWING',
      }
      const event = buildTransitionEvent(
        'IMPLEMENTING',
        'REVIEWING',
        baseBefore,
        stateAfter,
        '2026-01-01T00:00:00Z',
      )
      expect(event).not.toHaveProperty('stateOverrides')
    })
  })

  describe('parseStateName', () => {
    it('parses valid state name', () => {
      expect(WORKFLOW_DEFINITION.parseStateName('IMPLEMENTING')).toStrictEqual('IMPLEMENTING')
    })

    it('throws on invalid state name', () => {
      expect(() => WORKFLOW_DEFINITION.parseStateName('UNKNOWN_STATE')).toThrow(
        'invalid_enum_value',
      )
    })
  })
})
