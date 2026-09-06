import type { RunLocalVerification } from './ports/run-local-verification'
import type { PreconditionResult } from '@nt-ai-lab/deterministic-agent-workflow-dsl'
import {
  pass,
  fail,
  defineRecordingOps,
  checkOperationGate,
} from '@nt-ai-lab/deterministic-agent-workflow-dsl'
import type { BaseEvent, StoredReview } from '@nt-ai-lab/deterministic-agent-workflow-engine'
import { WorkflowStateError } from '@nt-ai-lab/deterministic-agent-workflow-engine'
import { WorkflowState } from './workflow-types'
import { WorkflowTransitionContext } from './workflow-transition-context'
import { MaintainerWorkflowRegistry } from './registry'
import type { WorkflowEvent } from './workflow-events'
import { parseWorkflowEvent } from './workflow-events'
import {
  buildPullRequestCreationRequest,
  parsePullRequestDescriptionOptions,
} from './pull-request-description'
import type { CreateWorkflowPullRequest } from './ports/create-pull-request'
import type { ReadWorkflowGitStatus } from './ports/read-git-status'
import type { ReadWorkflowPullRequestFeedback } from './ports/read-pull-request-feedback'
import { evaluateCodeRabbitFeedbackPoll } from './coderabbit-feedback-verification'
type StateName = WorkflowState['currentStateMachineState']
type LivingArchitectureReviewType = StoredReview['reviewType']
const PR_FEEDBACK_POLL_INTERVAL_MS = 15_000
const PR_FEEDBACK_MAX_ATTEMPTS = Math.floor(300_000 / PR_FEEDBACK_POLL_INTERVAL_MS) + 1

type WorkflowOperation =
  | keyof ReturnType<MaintainerWorkflowRegistry['recordingOperations']>
  | 'verify-local'
  | 'record-review'
  | 'create-pr'
  | 'verify-feedback-addressed'
type WorkflowDeps = {
  readonly runLocalVerification: RunLocalVerification
  readonly getGitInfo: ReadWorkflowGitStatus
  readonly getPrFeedback: ReadWorkflowPullRequestFeedback
  readonly createPullRequest: CreateWorkflowPullRequest
  readonly listSessionReviews: () => readonly StoredReview[]
  readonly sleepMs: (ms: number) => void
  readonly now: () => string
}
type PullRequestFeedbackReadSuccess = {
  readonly ok: true
  readonly feedback: ReturnType<ReadWorkflowPullRequestFeedback>
}
type PullRequestFeedbackReadFailure = {
  readonly ok: false
  readonly reason: string
}
type PullRequestFeedbackReadResult = PullRequestFeedbackReadSuccess | PullRequestFeedbackReadFailure
function readPrFeedback(
  getPrFeedback: ReadWorkflowPullRequestFeedback,
  prNumber: number,
  includeCodeRabbitStatus: boolean,
): PullRequestFeedbackReadResult {
  try {
    return {
      ok: true,
      feedback: getPrFeedback(prNumber, { includeCodeRabbitStatus }),
    }
  } catch (error) {
    return {
      ok: false,
      reason: `Unable to fetch PR feedback: ${String(error)}`,
    }
  }
}
/** @riviere-role aggregate */
export class MaintainerWorkflow {
  private state: WorkflowState
  private readonly registryDefinition: MaintainerWorkflowRegistry
  private readonly deps: WorkflowDeps
  private pendingEvents: WorkflowEvent[] = []

  private constructor(
    state: WorkflowState,
    registry: MaintainerWorkflowRegistry,
    deps: WorkflowDeps,
  ) {
    this.state = state
    this.registryDefinition = registry
    this.deps = deps
  }
  static build(
    registry: MaintainerWorkflowRegistry,
    deps: WorkflowDeps,
    state: unknown = WorkflowState.initial(),
  ): MaintainerWorkflow {
    return new MaintainerWorkflow(WorkflowState.parse(state), registry, deps)
  }
  getPendingEvents(): readonly WorkflowEvent[] {
    return this.pendingEvents
  }

  getState(): WorkflowState {
    return this.state
  }
  registry(): MaintainerWorkflowRegistry {
    return this.registryDefinition
  }

  getAgentInstructions(pluginRoot: string): string {
    return `${pluginRoot}/${this.registryDefinition.state(this.state.currentStateMachineState).agentInstructions}`
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
    this.append(event)
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
    const recordingOps = defineRecordingOps<StateName, WorkflowState, WorkflowOperation>(
      this.registryDefinition,
      this.registryDefinition.recordingOperations(),
    )
    const result = recordingOps.executeOp(op, this.state, this.deps.now(), args)
    if (!result.pass) return fail(result.reason)
    this.appendEvent(result.event)
    return pass()
  }
  verifyLocal(): PreconditionResult {
    const gate = checkOperationGate('verify-local', this.state, this.registryDefinition)
    if (!gate.pass) return gate
    try {
      const before = this.deps.getGitInfo()
      if (!before.workingTreeClean)
        throw new WorkflowStateError('Local verification requires a clean worktree.')
      this.deps.runLocalVerification()
      const after = this.deps.getGitInfo()
      if (!after.workingTreeClean || after.headCommit !== before.headCommit) {
        throw new WorkflowStateError('The worktree changed during local verification.')
      }
      this.append({
        type: 'local-verification-completed',
        at: this.deps.now(),
        result: { status: 'passed', headCommit: after.headCommit },
      })
      return pass()
    } catch (error) {
      const reason = `Local verification failed: ${String(error)}`
      this.append({
        type: 'local-verification-completed',
        at: this.deps.now(),
        result: { status: 'failed', reason },
      })
      this.appendAutomaticTransition('BLOCKED')
      return fail(reason)
    }
  }

  createPr(rawArgs: unknown): PreconditionResult {
    const gate = checkOperationGate('create-pr', this.state, this.registryDefinition)
    if (!gate.pass) return gate

    if (this.state.githubIssue === undefined) {
      return fail('githubIssue not set. Record the issue before creating a PR.')
    }
    if (this.state.featureBranch === undefined) {
      return fail('featureBranch not set. Record the branch before creating a PR.')
    }

    const parsedDescription = parsePullRequestDescriptionOptions(rawArgs)
    if (!parsedDescription.ok) {
      return fail(parsedDescription.reason)
    }

    try {
      const gitInfo = this.deps.getGitInfo()
      if (!this.state.hasPassedVerificationFor(gitInfo.headCommit) || !gitInfo.workingTreeClean) {
        return fail(
          'Local verification must pass for the current clean commit before creating a PR.',
        )
      }
      const pullRequestRequest = buildPullRequestCreationRequest(
        parsedDescription.input,
        this.state.githubIssue,
        this.state.featureBranch,
        gitInfo.defaultBranch,
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
        pullRequestSnapshot: {
          repository: pullRequest.repository,
          issue: this.state.githubIssue,
          branch: this.state.featureBranch,
          prNumber: pullRequest.prNumber,
          prUrl: pullRequest.prUrl,
          baseRevision: pullRequest.baseRevision,
          headRevision: pullRequest.headRevision,
        },
      })
      return pass()
    } catch (error) {
      return fail(`Unable to create PR: ${String(error)}`)
    }
  }

  verifyFeedbackAddressed(): PreconditionResult {
    const gate = checkOperationGate(
      'verify-feedback-addressed',
      this.state,
      this.registryDefinition,
    )
    if (!gate.pass) return gate
    if (this.state.prNumber === undefined) {
      return fail('prNumber not set. Record the PR before verifying feedback.')
    }

    const feedbackResult = readPrFeedback(
      this.deps.getPrFeedback,
      this.state.prNumber,
      this.state.coderabbitRateLimitEvidence === undefined,
    )
    if (!feedbackResult.ok) return fail(feedbackResult.reason)
    const { feedback } = feedbackResult
    const assessment = evaluateCodeRabbitFeedbackPoll(
      feedback,
      this.state.prNumber,
      1,
      this.state.coderabbitRateLimitEvidence !== undefined,
    )
    const clean = assessment.type === 'verified' && assessment.clean
    this.appendFeedbackChecked(feedback, clean)

    if (feedback.reviewDecision === 'CHANGES_REQUESTED' && feedback.unresolvedCount > 0) {
      return fail(
        `PR still has CHANGES_REQUESTED review status and ${feedback.unresolvedCount} unresolved feedback threads. Resolve all feedback or transition to BLOCKED.`,
      )
    }
    if (feedback.reviewDecision === 'CHANGES_REQUESTED') {
      return fail(
        'PR has no unresolved feedback threads, but CodeRabbit still reports CHANGES_REQUESTED while it processes new commits. Wait and periodically run verify-feedback-addressed again. Do not transition to BLOCKED.',
      )
    }
    if (feedback.unresolvedCount > 0) {
      return fail(
        `PR still has ${feedback.unresolvedCount} unresolved feedback threads. Resolve all feedback or transition to BLOCKED.`,
      )
    }

    if (assessment.type !== 'verified')
      return fail(
        'CodeRabbit has not completed a verified review for the current head. Wait and retry verification.',
      )

    this.append({
      type: 'feedback-addressed',
      at: this.deps.now(),
    })
    this.appendAutomaticTransition('REFLECTING')
    return pass()
  }

  private appendFeedbackChecked(
    feedback: ReturnType<ReadWorkflowPullRequestFeedback>,
    clean: boolean,
  ): void {
    this.append({
      type: 'feedback-checked',
      at: this.deps.now(),
      clean,
      ...(feedback.coderabbitRateLimitEvidence === undefined
        ? {}
        : { coderabbitRateLimitEvidence: feedback.coderabbitRateLimitEvidence }),
      unresolvedCount: feedback.unresolvedCount,
      reviewDecision: feedback.reviewDecision,
    })
  }

  private awaitPrFeedback(prNumber: number): void {
    this.pollPrFeedback(prNumber, PR_FEEDBACK_MAX_ATTEMPTS)
  }

  private pollPrFeedback(prNumber: number, attemptsRemaining: number): void {
    const feedbackResult = readPrFeedback(
      this.deps.getPrFeedback,
      prNumber,
      this.state.coderabbitRateLimitEvidence === undefined,
    )
    if (!feedbackResult.ok) return this.appendPrFeedbackVerificationFailure(feedbackResult.reason)

    const { feedback } = feedbackResult
    const outcome = evaluateCodeRabbitFeedbackPoll(
      feedback,
      prNumber,
      attemptsRemaining,
      this.state.coderabbitRateLimitEvidence !== undefined,
    )
    if (outcome.type === 'timed-out')
      return this.appendPrFeedbackVerificationFailure(outcome.reason)
    if (outcome.type === 'retry') {
      this.deps.sleepMs(PR_FEEDBACK_POLL_INTERVAL_MS)
      this.pollPrFeedback(prNumber, attemptsRemaining - 1)
      return
    }

    const { clean } = outcome
    this.appendFeedbackChecked(feedback, clean)
    this.appendAutomaticTransition(clean ? 'REFLECTING' : 'ADDRESSING_FEEDBACK')
  }

  private appendAutomaticTransition(to: StateName): void {
    const from = this.state.currentStateMachineState
    const stateBefore = this.state
    const targetDef = this.registryDefinition.state(to)
    const stateAfter =
      targetDef.onEntry === undefined
        ? stateBefore
        : targetDef.onEntry(stateBefore, this.buildTransitionContext(stateBefore, from, to))
    const stateOverrides = stateAfter.transitionOverridesFrom(stateBefore)

    this.append({
      type: 'transitioned',
      at: this.deps.now(),
      from,
      to,
      ...(Object.keys(stateOverrides).length === 0 ? {} : { stateOverrides }),
    })
  }

  private buildTransitionContext(
    state: WorkflowState,
    from: StateName,
    to: StateName,
  ): WorkflowTransitionContext {
    return WorkflowTransitionContext.from({
      state,
      gitInfo: this.deps.getGitInfo(),
      from,
      to,
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
    const nextState = this.state.apply(event)
    this.pendingEvents = [...this.pendingEvents, event]
    this.state = nextState
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
