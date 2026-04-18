import { WORKFLOW_DEFINITION } from './workflow-definition'
import type { WorkflowDeps } from '../../domain/workflow'
import type { BaseEvent } from '@nt-ai-lab/deterministic-agent-workflow-engine'
import { WorkflowStateError } from '@nt-ai-lab/deterministic-agent-workflow-engine'
import type {
  WorkflowState, StateName 
} from '../../domain/workflow-types'

function makeWorkflowDeps(): WorkflowDeps {
  return {
    getGitInfo: () => ({
      currentBranch: 'main',
      workingTreeClean: true,
      headCommit: 'abc123',
      changedFilesVsDefault: [],
      hasCommitsVsDefault: false,
    }),
    getPrFeedback: () => ({
      reviewDecision: null,
      coderabbitReviewSeen: true,
      unresolvedCount: 0,
      threads: [],
    }),
    sleepMs: () => undefined,
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
  it('builds a Workflow in IMPLEMENTING state from initial state', () => {
    const workflow = WORKFLOW_DEFINITION.buildWorkflow(
      WORKFLOW_DEFINITION.initialState(),
      makeWorkflowDeps(),
    )
    expect(workflow.getState().currentStateMachineState).toStrictEqual('IMPLEMENTING')
  })

  it('builds a Workflow from initial state (pass-through, no events folded)', () => {
    const state = WORKFLOW_DEFINITION.initialState()
    const workflow = WORKFLOW_DEFINITION.buildWorkflow(state, makeWorkflowDeps())
    expect(workflow.getState().currentStateMachineState).toStrictEqual('IMPLEMENTING')
  })

  it('folds a valid event onto state', () => {
    const event: BaseEvent & Record<string, unknown> = {
      type: 'issue-recorded',
      at: '2026-01-01T00:00:00Z',
      issueNumber: 42,
    }
    const state = WORKFLOW_DEFINITION.fold(WORKFLOW_DEFINITION.initialState(), event)
    const workflow = WORKFLOW_DEFINITION.buildWorkflow(state, makeWorkflowDeps())
    expect(workflow.getState().githubIssue).toStrictEqual(42)
  })

  it('folds session-started event and makes transcriptPath available', () => {
    const event: BaseEvent & Record<string, unknown> = {
      type: 'session-started',
      at: '2026-01-01T00:00:00Z',
      transcriptPath: 'some/transcript.jsonl',
    }
    const state = WORKFLOW_DEFINITION.fold(WORKFLOW_DEFINITION.initialState(), event)
    const workflow = WORKFLOW_DEFINITION.buildWorkflow(state, makeWorkflowDeps())
    expect(workflow.getTranscriptPath()).toBe('some/transcript.jsonl')
  })

  it('returns state unchanged for unknown event types (e.g. platform observation events)', () => {
    const event: BaseEvent = {
      type: 'identity-verified',
      at: '2026-01-01T00:00:00Z',
    }
    const state = WORKFLOW_DEFINITION.initialState()
    const result = WORKFLOW_DEFINITION.fold(state, event)
    expect(result).toStrictEqual(state)
  })

  it('throws when a known event type has a malformed payload', () => {
    const malformed: BaseEvent & Record<string, unknown> = {
      type: 'issue-recorded',
      at: '2026-01-01T00:00:00Z',
      issueNumber: 'not-a-number',
    }
    expect(() => WORKFLOW_DEFINITION.fold(WORKFLOW_DEFINITION.initialState(), malformed)).toThrow(
      'Malformed workflow event "issue-recorded"',
    )
  })

  it('returns initial state with IMPLEMENTING', () => {
    const initial = WORKFLOW_DEFINITION.initialState()
    expect(initial.currentStateMachineState).toStrictEqual('IMPLEMENTING')
  })

  it('stateSchema parses valid state name', () => {
    expect(WORKFLOW_DEFINITION.stateSchema.parse('IMPLEMENTING')).toStrictEqual('IMPLEMENTING')
  })

  it('stateSchema throws on invalid state name', () => {
    expect(() => WORKFLOW_DEFINITION.stateSchema.parse('UNKNOWN_STATE')).toThrow(
      'Invalid enum value',
    )
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
})
