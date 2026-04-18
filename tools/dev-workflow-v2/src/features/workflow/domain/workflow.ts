import type {
  PreconditionResult,
  GitInfo,
  RecordingOpDefinition,
  TransitionContext,
} from '@nt-ai-lab/deterministic-agent-workflow-dsl'
import {
  pass,
  fail,
  defineRecordingOps,
  checkOperationGate,
} from '@nt-ai-lab/deterministic-agent-workflow-dsl'
import type { BaseEvent } from '@nt-ai-lab/deterministic-agent-workflow-engine'
import { WorkflowStateError } from '@nt-ai-lab/deterministic-agent-workflow-engine'
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
import type { PRFeedbackResult } from '../infra/external-clients/github/get-pr-feedback'

const PR_FEEDBACK_POLL_INTERVAL_MS = 15_000
const PR_FEEDBACK_TIMEOUT_MS = 300_000
const PR_FEEDBACK_MAX_ATTEMPTS =
  Math.floor(PR_FEEDBACK_TIMEOUT_MS / PR_FEEDBACK_POLL_INTERVAL_MS) + 1
const REQUIRED_CONSECUTIVE_CLEAN_CODERABBIT_POLLS = 2

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
}

const RECORDING_OPS = defineRecordingOps<StateName, WorkflowState, WorkflowOperation>(
  WORKFLOW_REGISTRY,
  RECORDING_OPS_MAP,
)

/** @riviere-role value-object */
export type WorkflowDeps = {
  readonly getGitInfo: () => GitInfo
  readonly getPrFeedback: (prNumber: number) => PRFeedbackResult
  readonly sleepMs: (ms: number) => void
  readonly now: () => string
}

function diffStateOverrides(
  stateBefore: WorkflowState,
  stateAfter: WorkflowState,
): Record<string, unknown> {
  const overrides: Record<string, unknown> = {}
  const beforeEntries = new Map(Object.entries(stateBefore))
  for (const [key, value] of Object.entries(stateAfter)) {
    if (key === 'currentStateMachineState') continue
    if (value !== beforeEntries.get(key)) {
      overrides[key] = value
    }
  }
  return overrides
}

function isFeedbackClear(feedback: PRFeedbackResult): boolean {
  return feedback.reviewDecision !== 'CHANGES_REQUESTED' && feedback.unresolvedCount === 0
}

function readPrFeedback(
  getPrFeedback: (prNumber: number) => PRFeedbackResult,
  prNumber: number,
):
  | {
    ok: true
    feedback: PRFeedbackResult
  }
  | {
    ok: false
    reason: string
  } {
  try {
    return {
      ok: true,
      feedback: getPrFeedback(prNumber),
    }
  } catch (error) {
    return {
      ok: false,
      reason: `Unable to fetch PR feedback: ${String(error)}`,
    }
  }
}

/** @riviere-role domain-service */
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

    if (workflowEvent.type === 'transitioned' && workflowEvent.to === 'AWAITING_PR_FEEDBACK') {
      if (this.state.prNumber === undefined) {
        this.appendAutomaticTransition('BLOCKED')
        return
      }
      this.awaitPrFeedback(this.state.prNumber)
    }
  }

  startSession(transcriptPath: string, repository: string | undefined): void {
    const event: WorkflowEvent = {
      type: 'session-started',
      at: this.deps.now(),
      transcriptPath,
      ...(repository === undefined ? {} : { repository }),
    }
    this.pendingEvents = [...this.pendingEvents, event]
    this.state = applyEvent(this.state, event)
  }

  getTranscriptPath(): string {
    if (this.state.transcriptPath === undefined) {
      throw new WorkflowStateError('Transcript path not set. Session has not been started.')
    }
    return this.state.transcriptPath
  }

  registerAgent(agentType: string, agentId: string): PreconditionResult {
    void agentType
    void agentId
    return pass()
  }

  handleTeammateIdle(agentName: string): PreconditionResult {
    void agentName
    return pass()
  }

  executeRecording(op: WorkflowOperation, ...args: readonly unknown[]): PreconditionResult {
    const result = RECORDING_OPS.executeOp(op, this.state, this.deps.now(), args)
    if (!result.pass) return fail(result.reason)
    this.appendEvent(result.event)
    return pass()
  }

  verifyFeedbackAddressed(): PreconditionResult {
    const gate = checkOperationGate('verify-feedback-addressed', this.state, WORKFLOW_REGISTRY)
    if (!gate.pass) return gate
    if (this.state.prNumber === undefined) {
      return fail('prNumber not set. Record the PR before verifying feedback.')
    }

    const feedbackResult = readPrFeedback(this.deps.getPrFeedback, this.state.prNumber)
    if (!feedbackResult.ok) return fail(feedbackResult.reason)
    const { feedback } = feedbackResult

    const clean = isFeedbackClear(feedback)
    this.append({
      type: 'feedback-checked',
      at: this.deps.now(),
      clean,
      unresolvedCount: feedback.unresolvedCount,
      reviewDecision: feedback.reviewDecision,
    })

    if (feedback.reviewDecision === 'CHANGES_REQUESTED' && feedback.unresolvedCount > 0) {
      return fail(
        `PR still has CHANGES_REQUESTED review status and ${feedback.unresolvedCount} unresolved feedback threads. Resolve all feedback or transition to BLOCKED.`,
      )
    }
    if (feedback.reviewDecision === 'CHANGES_REQUESTED') {
      return fail(
        'PR still has CHANGES_REQUESTED review status. Resolve all feedback or transition to BLOCKED.',
      )
    }
    if (feedback.unresolvedCount > 0) {
      return fail(
        `PR still has ${feedback.unresolvedCount} unresolved feedback threads. Resolve all feedback or transition to BLOCKED.`,
      )
    }

    this.append({
      type: 'feedback-addressed',
      at: this.deps.now(),
    })
    return pass()
  }

  private awaitPrFeedback(prNumber: number): void {
    this.pollPrFeedback(prNumber, PR_FEEDBACK_MAX_ATTEMPTS, 0)
  }

  private pollPrFeedback(
    prNumber: number,
    attemptsRemaining: number,
    consecutiveCleanPolls: number,
  ): void {
    const feedbackResult = readPrFeedback(this.deps.getPrFeedback, prNumber)
    if (!feedbackResult.ok) {
      this.appendAutomaticTransition('BLOCKED')
      return
    }

    const { feedback } = feedbackResult
    if (!feedback.coderabbitReviewSeen) {
      this.scheduleNextPrFeedbackPoll(prNumber, attemptsRemaining, 0)
      return
    }

    const clean = isFeedbackClear(feedback)
    const nextConsecutiveCleanPolls = clean ? consecutiveCleanPolls + 1 : 0
    if (
      clean &&
      // On the last allowed poll, a newly clean CodeRabbit result is accepted instead of timing out a PR that just became ready.
      nextConsecutiveCleanPolls < REQUIRED_CONSECUTIVE_CLEAN_CODERABBIT_POLLS &&
      attemptsRemaining > 1
    ) {
      this.deps.sleepMs(PR_FEEDBACK_POLL_INTERVAL_MS)
      this.pollPrFeedback(prNumber, attemptsRemaining - 1, nextConsecutiveCleanPolls)
      return
    }

    this.append({
      type: 'feedback-checked',
      at: this.deps.now(),
      clean,
      unresolvedCount: feedback.unresolvedCount,
      reviewDecision: feedback.reviewDecision,
    })
    this.appendAutomaticTransition(clean ? 'REFLECTING' : 'ADDRESSING_FEEDBACK')
  }

  private scheduleNextPrFeedbackPoll(
    prNumber: number,
    attemptsRemaining: number,
    consecutiveCleanPolls: number,
  ): void {
    if (attemptsRemaining <= 1) {
      this.appendAutomaticTransition('BLOCKED')
      return
    }

    this.deps.sleepMs(PR_FEEDBACK_POLL_INTERVAL_MS)
    this.pollPrFeedback(prNumber, attemptsRemaining - 1, consecutiveCleanPolls)
  }

  private appendAutomaticTransition(to: StateName): void {
    const from = this.state.currentStateMachineState
    const stateBefore = this.state
    const context: TransitionContext<WorkflowState, StateName> = {
      state: stateBefore,
      gitInfo: this.deps.getGitInfo(),
      from,
      to,
    }
    const targetDef = getStateDefinition(to)
    const stateAfter =
      targetDef.onEntry === undefined ? stateBefore : targetDef.onEntry(stateBefore, context)
    const stateOverrides = diffStateOverrides(stateBefore, stateAfter)

    this.append({
      type: 'transitioned',
      at: this.deps.now(),
      from,
      to,
      ...(Object.keys(stateOverrides).length === 0 ? {} : { stateOverrides }),
    })
  }

  private append(event: WorkflowEvent): void {
    this.pendingEvents = [...this.pendingEvents, event]
    this.state = applyEvent(this.state, event)
  }
}
