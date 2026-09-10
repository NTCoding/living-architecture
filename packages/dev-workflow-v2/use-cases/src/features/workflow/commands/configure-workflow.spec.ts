import { configureWorkflow } from './configure-workflow'
import { MaintainerWorkflow } from '@living-architecture/dev-workflow-v2-domain-model/domain/workflow'
import type { BaseEvent } from '@nt-ai-lab/deterministic-agent-workflow-engine'
import { WorkflowStateError } from '@nt-ai-lab/deterministic-agent-workflow-engine'
import { ReviewStatuses } from '@living-architecture/dev-workflow-v2-domain-model/domain/reviews/statuses'
import { WorkflowState } from '@living-architecture/dev-workflow-v2-domain-model/domain/workflow-types'

type WorkflowDeps = Parameters<typeof MaintainerWorkflow.build>[1]
type StateName = WorkflowState['currentStateMachineState']
const ALL_PENDING = ReviewStatuses.pending()
const WORKFLOW_DEFINITION = configureWorkflow({})

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
      reviewerStatuses: {
        'architecture-review': 'APPROVED',
        'code-review': 'APPROVED',
        'bug-scanner': 'APPROVED',
        'task-check': 'APPROVED',
        coderabbit: 'APPROVED',
      },
      reviewDecision: null,
      coderabbitReviewSeen: true,
      unresolvedCount: 0,
      threads: [],
    }),
    createPullRequest: () => ({
      prNumber: 1,
      prUrl: 'https://github.com/example/repo/pull/1',
      isDraft: false,
    }),
    listSessionReviews: () => [],
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
  if (!fn) throw new WorkflowStateError('buildTransitionEvent not defined')
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
      expect(registry.HUMAN_REVIEWING).toBeDefined()
    })

    it('marks HUMAN_REVIEWING and BLOCKED as write-forbidden states', () => {
      const registry = WORKFLOW_DEFINITION.getRegistry()
      expect(registry.BLOCKED.forbidden).toStrictEqual({ write: true })
      expect(registry.HUMAN_REVIEWING.forbidden).toStrictEqual({ write: true })
    })
  })

  describe('buildTransitionContext', () => {
    it('builds context with state and transition info', () => {
      const state = WorkflowState.parse({
        currentStateMachineState: 'IMPLEMENTING',
        reviewerStatuses: ALL_PENDING,
        prNumber: 42,
      })
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
    const baseBefore = WorkflowState.parse({
      currentStateMachineState: 'IMPLEMENTING',
      reviewerStatuses: ALL_PENDING,
    })

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

    it('produces event with reviewer status reset when re entering implementation', () => {
      const reviewedBefore = baseBefore.with({
        reviewerStatuses: {
          ...baseBefore.reviewerStatuses,
          'code-review': 'APPROVED',
        },
      })
      const stateAfter = baseBefore.with({
        reviewerStatuses: ALL_PENDING,
      })
      const event = buildTransitionEvent(
        'REVIEWING',
        'IMPLEMENTING',
        reviewedBefore,
        stateAfter,
        '2026-01-01T00:00:00Z',
      )
      expect(event).toHaveProperty('stateOverrides', {
        reviewerStatuses: ALL_PENDING,
      })
    })

    it('does not include currentStateMachineState in stateOverrides when statuses are unchanged', () => {
      const stateAfter = baseBefore.with({ currentStateMachineState: 'REVIEWING' })
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
