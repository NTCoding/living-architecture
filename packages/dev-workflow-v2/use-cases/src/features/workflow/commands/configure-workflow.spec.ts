import { configureWorkflow } from './configure-workflow'
import { makeWorkflowDeps } from './__fixtures__/workflow-dependencies'
import type { BaseEvent } from '@nt-ai-lab/deterministic-agent-workflow-engine'
import { WorkflowStateError } from '@nt-ai-lab/deterministic-agent-workflow-engine'
import { WorkflowState } from '@living-architecture/dev-workflow-v2-domain-model/domain/workflow-types'
import { ReviewerDefinition } from '@living-architecture/dev-workflow-v2-domain-model/domain/reviewer-definitions'
import { describe, expect, it, vi } from 'vitest'

const REVIEWER_DEFINITIONS = [
  {
    reviewType: 'architecture-review',
    agentInstructions: 'agents/architecture-review.md',
    version: '1',
  },
  { reviewType: 'code-review', agentInstructions: 'agents/code-review.md', version: '1' },
  { reviewType: 'bug-scanner', agentInstructions: 'agents/bug-scanner.md', version: '1' },
  { reviewType: 'task-check', agentInstructions: 'agents/task-check.md', version: '1' },
] as const

type StateName = WorkflowState['currentStateMachineState']
const WORKFLOW_DEFINITION = configureWorkflow({ runCodeReview: () => undefined })

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

function runAfterEntry(state: { readonly afterEntry?: () => void }): void {
  const afterEntry = state.afterEntry
  if (!afterEntry) throw new WorkflowStateError('afterEntry hook not defined')
  afterEntry.call(state)
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

    it('marks COMPLETE and BLOCKED as write-forbidden states', () => {
      const registry = WORKFLOW_DEFINITION.getRegistry()
      expect(registry.BLOCKED.forbidden).toStrictEqual({ write: true })
      expect(registry.COMPLETE.forbidden).toStrictEqual({ write: true })
    })
  })

  describe('pendingReviewers', () => {
    const reviewers = ReviewerDefinition.parseAll([...REVIEWER_DEFINITIONS])
    const satisfied = { status: 'satisfied' as const, reviewId: 1, headRevision: 'b'.repeat(40) }
    const notRun = { status: 'not-run' as const }
    const satisfiedFor = (reviewType: string) => ({
      'architecture-review': reviewType === 'architecture-review' ? satisfied : notRun,
      'code-review': reviewType === 'code-review' ? satisfied : notRun,
      'bug-scanner': reviewType === 'bug-scanner' ? satisfied : notRun,
      'task-check': reviewType === 'task-check' ? satisfied : notRun,
    })

    it('returns every reviewer when none has recorded satisfaction', () => {
      const state = WORKFLOW_DEFINITION.initialState()
      expect(WORKFLOW_DEFINITION.pendingReviewers(reviewers, state)).toStrictEqual(reviewers)
    })

    it('excludes reviewers that already recorded satisfaction once', () => {
      const state = WORKFLOW_DEFINITION.initialState().with({
        reviewerSatisfaction: satisfiedFor('code-review'),
      })
      expect(WORKFLOW_DEFINITION.pendingReviewers(reviewers, state)).toStrictEqual(
        reviewers.filter((reviewer) => reviewer.reviewType !== 'code-review'),
      )
    })

    it('returns no reviewers once all four are satisfied', () => {
      const state = WORKFLOW_DEFINITION.initialState().with({
        reviewerSatisfaction: {
          'architecture-review': satisfied,
          'code-review': satisfied,
          'bug-scanner': satisfied,
          'task-check': satisfied,
        },
      })
      expect(WORKFLOW_DEFINITION.pendingReviewers(reviewers, state)).toStrictEqual([])
    })
  })

  describe('afterEntry wiring', () => {
    it('runs the code review with the reviewer definitions when REVIEWING is entered', () => {
      const runCodeReview = vi.fn()
      const definition = configureWorkflow({ runCodeReview })
      const workflow = definition.buildWorkflow(definition.initialState(), makeWorkflowDeps())

      runAfterEntry(definition.getRegistry().REVIEWING)

      expect(runCodeReview).toHaveBeenCalledOnce()
      expect(runCodeReview).toHaveBeenCalledWith(REVIEWER_DEFINITIONS)
      expect(workflow.getState().currentStateMachineState).toStrictEqual('IMPLEMENTING')
    })
  })

  describe('buildTransitionContext', () => {
    it('builds context with state and transition info', () => {
      const state = WorkflowState.parse({
        currentStateMachineState: 'IMPLEMENTING',
        architectureReviewPassed: false,
        codeReviewPassed: false,
        bugScannerPassed: false,
        taskCheckPassed: false,
        ciPassed: false,
        feedbackClean: false,
        feedbackAddressed: false,
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
      architectureReviewPassed: true,
      codeReviewPassed: true,
      bugScannerPassed: true,
      taskCheckPassed: false,
      ciPassed: true,
      feedbackClean: true,
      feedbackAddressed: true,
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

    it('produces event with stateOverrides when onEntry mutates state', () => {
      const stateAfter = baseBefore.with({
        architectureReviewPassed: false,
        codeReviewPassed: false,
        bugScannerPassed: false,
        ciPassed: false,
        feedbackClean: false,
        feedbackAddressed: false,
      })
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
