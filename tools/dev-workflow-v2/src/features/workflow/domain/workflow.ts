import type {
  PreconditionResult,
  RecordingOpDefinition,
  TransitionContext,
} from '@nt-ai-lab/deterministic-agent-workflow-dsl'
import {
  pass,
  fail,
  defineRecordingOps,
  checkOperationGate,
} from '@nt-ai-lab/deterministic-agent-workflow-dsl'
import type { BaseEvent, StoredReview } from '@nt-ai-lab/deterministic-agent-workflow-engine'
import { WorkflowStateError } from '@nt-ai-lab/deterministic-agent-workflow-engine'
import { WorkflowState } from './workflow-types'
import { WORKFLOW_REGISTRY, getStateDefinition } from './registry'
import type { WorkflowEvent } from './workflow-events'
import { parseWorkflowEvent } from './workflow-events'
import { applyEvent, EMPTY_STATE } from './fold'
import {
  buildPullRequestCreationRequest,
  parsePullRequestDescriptionOptions,
} from './pull-request-description'
import type { CreateWorkflowPullRequest } from './ports/create-pull-request'
import type { ReadWorkflowGitStatus } from './ports/read-git-status'
import type { ReadWorkflowPullRequestFeedback } from './ports/read-pull-request-feedback'

type StateName = WorkflowState['currentStateMachineState']
type WorkflowOperation =
  | 'record-issue'
  | 'record-branch'
  | 'record-review'
  | 'record-pr'
  | 'record-ci-passed'
  | 'record-ci-failed'
  | 'create-pr'
  | 'verify-feedback-addressed'
type LivingArchitectureReviewType =
  | 'architecture-review'
  | 'code-review'
  | 'bug-scanner'
  | 'task-check'

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

type WorkflowDeps = {
  readonly getGitInfo: ReadWorkflowGitStatus
  readonly getPrFeedback: ReadWorkflowPullRequestFeedback
  readonly createPullRequest: CreateWorkflowPullRequest
  readonly listSessionReviews: () => readonly StoredReview[]
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

function isFeedbackClear(feedback: ReturnType<ReadWorkflowPullRequestFeedback>): boolean {
  return feedback.reviewDecision !== 'CHANGES_REQUESTED' && feedback.unresolvedCount === 0
}

function readPrFeedback(
  getPrFeedback: ReadWorkflowPullRequestFeedback,
  prNumber: number,
):
  | {
    ok: true
    feedback: ReturnType<ReadWorkflowPullRequestFeedback>
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

  static rehydrate(state: unknown, deps: WorkflowDeps): Workflow {
    return new Workflow(WorkflowState.parse(state), deps)
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
    const workflowEvent = parseWorkflowEvent(event)
    this.append(workflowEvent)

    if (workflowEvent.type === 'transitioned' && workflowEvent.to === 'AWAITING_PR_FEEDBACK') {
      if (this.state.prNumber === undefined) {
        this.appendPrFeedbackVerificationFailure(
          'prNumber not set. Record the PR before awaiting PR feedback.',
        )
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

  getRecordedReviews(): readonly StoredReview[] {
    return this.deps.listSessionReviews()
  }

  getReviewDetails(reviewId: number): StoredReview {
    const review = this.getRecordedReviews().find(
      (recordedReview) => recordedReview.id === reviewId,
    )
    if (review === undefined) {
      throw new WorkflowStateError(`Review ${String(reviewId)} not found in current session.`)
    }
    return review
  }

  getLatestReviewByType(reviewType: LivingArchitectureReviewType): StoredReview | undefined {
    const reviewsOfType = this.getRecordedReviews()
      .filter((recordedReview) => recordedReview.reviewType === reviewType)
      .slice()
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    return reviewsOfType.at(-1)
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

  createPr(rawArgs: unknown): PreconditionResult {
    const gate = checkOperationGate('create-pr', this.state, WORKFLOW_REGISTRY)
    if (!gate.pass) return gate

    if (this.state.githubIssue === undefined) {
      return fail('githubIssue not set. Record the issue before creating a PR.')
    }

    const parsedDescription = parsePullRequestDescriptionOptions(rawArgs)
    if (!parsedDescription.ok) {
      return fail(parsedDescription.reason)
    }

    try {
      const pullRequestRequest = buildPullRequestCreationRequest(
        parsedDescription.input,
        this.state.githubIssue,
      )
      const pullRequest = this.deps.createPullRequest(pullRequestRequest)
      if (pullRequest.isDraft) {
        return fail(
          `Expected workflow-created PR #${pullRequest.prNumber} to be ready for review. Got draft PR. Transition to BLOCKED; do not use gh pr ready as a workaround.`,
        )
      }
      this.append({
        type: 'pr-recorded',
        at: this.deps.now(),
        prNumber: pullRequest.prNumber,
        prUrl: pullRequest.prUrl,
      })
      return pass()
    } catch (error) {
      return fail(`Unable to create PR: ${String(error)}`)
    }
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
      this.appendPrFeedbackVerificationFailure(feedbackResult.reason)
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
      this.appendPrFeedbackVerificationFailure(
        `CodeRabbit feedback did not appear within ${PR_FEEDBACK_TIMEOUT_MS}ms for PR #${prNumber}.`,
      )
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

  private appendPrFeedbackVerificationFailure(reason: string): void {
    this.append({
      type: 'pr-feedback-verification-failed',
      at: this.deps.now(),
      reason,
    })
    this.appendAutomaticTransition('BLOCKED')
  }

  private append(event: WorkflowEvent): void {
    if (this.isPrFeedbackBlockedWithoutFailureEvent(event)) {
      throw new WorkflowStateError(
        'Expected pr-feedback-verification-failed event before AWAITING_PR_FEEDBACK can transition to BLOCKED.',
      )
    }
    this.pendingEvents = [...this.pendingEvents, event]
    this.state = applyEvent(this.state, event)
  }

  private isPrFeedbackBlockedWithoutFailureEvent(event: WorkflowEvent): boolean {
    if (event.type !== 'transitioned') return false
    if (event.from !== 'AWAITING_PR_FEEDBACK') return false
    if (event.to !== 'BLOCKED') return false

    const previousEvent = this.pendingEvents.at(-1)
    if (previousEvent === undefined) return true
    return previousEvent.type !== 'pr-feedback-verification-failed'
  }
}
