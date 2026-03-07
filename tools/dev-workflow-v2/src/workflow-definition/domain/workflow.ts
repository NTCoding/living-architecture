import type {
  PreconditionResult,
  GitInfo,
  RecordingOpDefinition,
} from '@ntcoding/agentic-workflow-builder/dsl'
import {
  pass, fail, defineRecordingOps 
} from '@ntcoding/agentic-workflow-builder/dsl'
import type { BaseEvent } from '@ntcoding/agentic-workflow-builder/engine'
import type {
  WorkflowState, StateName, WorkflowOperation 
} from './workflow-types'
import {
  WORKFLOW_REGISTRY, getStateDefinition 
} from './registry'
import { WORKFLOW_STATE_SCHEMA } from './workflow-types'
import type { WorkflowEvent } from './workflow-events'
import { WORKFLOW_EVENT_SCHEMA } from './workflow-events'
import {
  applyEvent, EMPTY_STATE 
} from './fold'
import type { PRFeedbackResult } from '../../infra/github/get-pr-feedback'

const RECORDING_OPS_MAP: Record<string, RecordingOpDefinition<readonly never[]>> = {
  'record-issue': {
    event: 'issue-recorded',
    payload: (n: number) => ({ issueNumber: n }),
  },
  'record-branch': {
    event: 'branch-recorded',
    payload: (b: string) => ({ branch: b }),
  },
  'record-architecture-review-passed': {
    event: 'architecture-review-completed',
    payload: () => ({ passed: true }),
  },
  'record-architecture-review-failed': {
    event: 'architecture-review-completed',
    payload: () => ({ passed: false }),
  },
  'record-code-review-passed': {
    event: 'code-review-completed',
    payload: () => ({ passed: true }),
  },
  'record-code-review-failed': {
    event: 'code-review-completed',
    payload: () => ({ passed: false }),
  },
  'record-bug-scanner-passed': {
    event: 'bug-scanner-completed',
    payload: () => ({ passed: true }),
  },
  'record-bug-scanner-failed': {
    event: 'bug-scanner-completed',
    payload: () => ({ passed: false }),
  },
  'record-task-check-passed': {
    event: 'task-check-passed',
    payload: () => ({}),
  },
  'record-pr': {
    event: 'pr-recorded',
    payload: (n: number, url?: string) => ({
      prNumber: n,
      ...(url ? { prUrl: url } : {}),
    }),
  },
  'record-ci-passed': {
    event: 'ci-completed',
    payload: () => ({ passed: true }),
  },
  'record-ci-failed': {
    event: 'ci-completed',
    payload: (output: string) => ({
      passed: false,
      output,
    }),
  },
  'record-feedback-clean': {
    event: 'feedback-checked',
    payload: () => ({ clean: true }),
  },
  'record-feedback-exists': {
    event: 'feedback-checked',
    payload: (count: number) => ({
      clean: false,
      unresolvedCount: count,
    }),
  },
  'record-feedback-addressed': {
    event: 'feedback-addressed',
    payload: (count: number) => ({ addressedCount: count }),
  },
  'record-reflection': {
    event: 'reflection-written',
    payload: (p: string) => ({ path: p }),
  },
}

const RECORDING_OPS = defineRecordingOps<StateName, WorkflowState, WorkflowOperation>(
  WORKFLOW_REGISTRY,
  RECORDING_OPS_MAP,
)

export type WorkflowDeps = {
  readonly getGitInfo: () => GitInfo
  readonly checkPrChecks: (prNumber: number) => boolean
  readonly getPrFeedback: (prNumber: number) => PRFeedbackResult
  readonly now: () => string
}

export class Workflow {
  private state: WorkflowState
  private readonly deps: WorkflowDeps
  private pendingEvents: WorkflowEvent[] = []

  private constructor(state: WorkflowState, deps: WorkflowDeps) {
    this.state = state
    this.deps = deps
  }

  static createFresh(deps: WorkflowDeps): Workflow {
    return new Workflow(EMPTY_STATE, deps)
  }

  static rehydrate(state: WorkflowState, deps: WorkflowDeps): Workflow {
    return new Workflow(WORKFLOW_STATE_SCHEMA.parse(state), deps)
  }

  static procedurePath(state: string, pluginRoot: string): string {
    return `${pluginRoot}/${getStateDefinition(state).agentInstructions}`
  }

  getPendingEvents(): readonly WorkflowEvent[] {
    return this.pendingEvents
  }

  getState(): WorkflowState {
    return this.state
  }

  getAgentInstructions(pluginRoot: string): string {
    return `${pluginRoot}/${getStateDefinition(this.state.currentStateMachineState).agentInstructions}`
  }

  appendEvent(event: BaseEvent): void {
    const workflowEvent = WORKFLOW_EVENT_SCHEMA.parse(event)
    this.pendingEvents = [...this.pendingEvents, workflowEvent]
    this.state = applyEvent(this.state, workflowEvent)

    if (
      workflowEvent.type === 'transitioned' &&
      workflowEvent.to === 'CHECKING_FEEDBACK' &&
      this.state.prNumber !== undefined
    ) {
      this.autoFetchFeedback(this.state.prNumber)
    }
  }

  startSession(_transcriptPath: string | undefined, repository: string | undefined): void {
    const event: WorkflowEvent = {
      type: 'session-started',
      at: this.deps.now(),
      ...(repository === undefined ? {} : { repository }),
    }
    this.pendingEvents = [...this.pendingEvents, event]
    this.state = applyEvent(this.state, event)
  }

  executeRecording(op: WorkflowOperation, ...args: readonly unknown[]): PreconditionResult {
    const result = RECORDING_OPS.executeOp(op, this.state, this.deps.now(), args)
    if (!result.pass) return fail(result.reason)
    this.appendEvent(result.event)
    return pass()
  }

  private autoFetchFeedback(prNumber: number): void {
    const feedback = this.deps.getPrFeedback(prNumber)
    if (feedback.unresolvedCount === 0) {
      this.append({
        type: 'feedback-checked',
        at: this.deps.now(),
        clean: true,
      })
    } else {
      this.append({
        type: 'feedback-checked',
        at: this.deps.now(),
        clean: false,
        unresolvedCount: feedback.unresolvedCount,
      })
    }
  }

  private append(event: WorkflowEvent): void {
    this.pendingEvents = [...this.pendingEvents, event]
    this.state = applyEvent(this.state, event)
  }
}
