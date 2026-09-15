import type {
  PreconditionResult,
  RecordingOpDefinition,
} from '@nt-ai-lab/deterministic-agent-workflow-dsl'
import type { BaseEvent, StoredReview } from '@nt-ai-lab/deterministic-agent-workflow-engine'
import { WorkflowStateError } from '@nt-ai-lab/deterministic-agent-workflow-engine'
import { type WorkflowStateNameValue, WorkflowState } from './workflow-types'
import { ReviewCycleLimit } from './review-cycle-limit'
import type { PullRequestCreationDetails } from './pull-request-description'
import { MaintainerWorkflowRegistry } from './registry'
import type { MaintainerWorkflowOperationValue } from './maintainer-workflow-operation'
import { ReviewingState } from './states/reviewing'
import { SubmittingPrState } from './states/submitting-pr'
import type { CreateWorkflowPullRequest } from './ports/create-pull-request'
import type { ReadWorkflowPullRequestFeedback } from './ports/read-pull-request-feedback'
import { AggregateReviewOutcome } from './aggregate-review-outcome'
import { WorkflowDependencies } from './workflow-dependencies'

export { AggregateReviewOutcome } from './aggregate-review-outcome'
export { WorkflowDependencies } from './workflow-dependencies'
import type { Reviewer } from './reviews/reviewers'
import { Reviewer as ReviewerValue } from './reviews/reviewers'
import type { ReviewerStatus } from './reviews/statuses'
import {
  type WorkflowEvent,
  PrRecorded,
  ReviewCycleClosed,
  ReviewCycleStarted,
  ReviewerStatusRecorded,
  SessionStarted,
  Transitioned,
} from './workflow-events'
import { WorkflowTransitionContext } from './workflow-transition-context'
type LivingArchitectureReviewType = StoredReview['reviewType']
const RECORDING_OPS_MAP: Record<string, RecordingOpDefinition<readonly never[]>> = {
  'record-issue': {
    event: 'issue-recorded',
    payload: (n: number) => ({ issueNumber: n }),
  },
  'record-branch': {
    event: 'branch-recorded',
    payload: (b: string) => ({ branch: b }),
  },
}
type RecordingOperation = keyof typeof RECORDING_OPS_MAP

/** @riviere-role aggregate */
export class MaintainerWorkflow {
  private state: WorkflowState
  private readonly registryDefinition: MaintainerWorkflowRegistry
  private readonly deps: WorkflowDependencies
  private pendingEvents: WorkflowEvent[] = []

  private constructor(
    state: WorkflowState,
    registry: MaintainerWorkflowRegistry,
    deps: WorkflowDependencies,
  ) {
    this.state = state
    this.deps = deps
    this.registryDefinition = MaintainerWorkflowRegistry.parse({
      ...registry,
      REVIEWING: ReviewingState.parse('REVIEWING', { workflow: this }),
      SUBMITTING_PR: SubmittingPrState.parse('SUBMITTING_PR'),
    })
  }
  static build(
    registry: MaintainerWorkflowRegistry,
    deps: WorkflowDependencies,
    state?: unknown,
  ): MaintainerWorkflow {
    return new MaintainerWorkflow(
      WorkflowState.parse(state === undefined ? deps.readInitialWorkflowState() : state),
      registry,
      deps,
    )
  }
  getPendingEvents(): readonly WorkflowEvent[] {
    return this.pendingEvents
  }

  getState(): WorkflowState {
    return this.state
  }

  getPullRequestNumber(): number {
    if (this.state.prNumber === undefined)
      throw new WorkflowStateError('Workflow has no recorded pull request.')
    return this.state.prNumber
  }

  getSubmissionDetails(): { readonly githubIssue: number; readonly featureBranch: string } {
    if (this.state.githubIssue === undefined || this.state.featureBranch === undefined)
      throw new WorkflowStateError('Workflow is not ready to submit a pull request.')
    return { githubIssue: this.state.githubIssue, featureBranch: this.state.featureBranch }
  }
  registry(): MaintainerWorkflowRegistry {
    return this.registryDefinition
  }

  getAgentInstructions(pluginRoot: string): string {
    return `${pluginRoot}/${this.registryDefinition.state(this.state.currentStateName()).agentInstructions}`
  }
  appendEvent(event: BaseEvent): void {
    const workflowEvent = this.deps.parseWorkflowEvent(event)
    this.append(workflowEvent)
  }
  startSession(transcriptPath: string, repository: string | undefined): void {
    const event = SessionStarted.parse({
      type: 'session-started',
      at: this.deps.now(),
      transcriptPath,
      ...(repository === undefined ? {} : { repository }),
    })
    this.pendingEvents = [...this.pendingEvents, event]
    this.state = this.state.apply(event)
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
    return this.operationPassed()
  }
  handleTeammateIdle(agentName: string): PreconditionResult {
    void agentName
    return this.operationPassed()
  }
  private operationPassed(): PreconditionResult {
    return { pass: true }
  }

  private operationFailed(reason: string): PreconditionResult {
    return { pass: false, reason }
  }

  private operationGate(op: MaintainerWorkflowOperationValue): PreconditionResult {
    const stateName = this.state.currentStateName()
    const definition = this.registryDefinition.state(stateName)
    if (definition.allowedWorkflowOperations.includes(op)) return this.operationPassed()
    return this.operationFailed(`${op} is not allowed in state ${stateName.name()}.`)
  }

  executeRecording(op: RecordingOperation, ...args: readonly unknown[]): PreconditionResult {
    const recordingOps = this.deps.buildRecordingOperations<
      WorkflowStateNameValue,
      WorkflowState,
      RecordingOperation
    >(this.registryDefinition, RECORDING_OPS_MAP)
    const result = recordingOps.executeOp(op, this.state, this.deps.now(), args)
    if (!result.pass) return this.operationFailed(result.reason)
    this.appendEvent(result.event)
    return this.operationPassed()
  }

  recordReviewerStatus(reviewer: Reviewer, status: ReviewerStatus): PreconditionResult {
    const gate = this.operationGate('record-reviewer-status')
    if (!gate.pass) return gate
    this.append(
      ReviewerStatusRecorded.parse({
        type: 'reviewer-status-recorded',
        at: this.deps.now(),
        reviewer: reviewer.name(),
        status: status.name(),
      }),
    )
    return this.operationPassed()
  }

  createPr(input: PullRequestCreationDetails): PreconditionResult {
    const gate = this.operationGate('create-pr')
    if (!gate.pass) return gate
    if (this.state.prNumber !== undefined) {
      return this.operationFailed('A pull request has already been recorded for this workflow.')
    }
    return this.submitPullRequest(input)
  }

  private submitPullRequest(input: PullRequestCreationDetails): PreconditionResult {
    try {
      const submission = this.getSubmissionDetails()
      const pullRequest = this.deps.createPullRequest(
        this.pullRequestCreationRequest(input, submission.githubIssue, submission.featureBranch),
      )
      this.append(
        PrRecorded.parse({
          type: 'pr-recorded',
          at: this.deps.now(),
          prNumber: pullRequest.prNumber,
          prUrl: pullRequest.prUrl,
        }),
      )
      return this.operationPassed()
    } catch (error) {
      return this.operationFailed(`Unable to create PR: ${String(error)}`)
    }
  }

  private pullRequestCreationRequest(
    input: PullRequestCreationDetails,
    githubIssue: number,
    branch: string,
  ): Parameters<CreateWorkflowPullRequest>[0] {
    return {
      branch,
      title: `${input.commitType.name()}(${input.commitScope.value()}): ${normalisePullRequestSubject(
        input.title.value(),
      )}`,
      body: [
        formatSection('Description', input.description.value()),
        formatSection('Linked Issue', `Closes #${githubIssue}`),
        formatSection('What Problem Does This PR Solve?', input.problem),
        formatSection('Acceptance Criteria', input.acceptanceCriteria),
        formatSection('Key Changes', input.keyChanges),
        formatSection('Notable Architectural Changes / Impact', input.architectureImpact),
        formatSection('Validation', input.validation),
        formatSection('Notes', input.notes),
      ].join('\n\n'),
    }
  }

  recordPullRequest(prNumber: number, prUrl: string): PreconditionResult {
    this.append(PrRecorded.parse({ type: 'pr-recorded', at: this.deps.now(), prNumber, prUrl }))
    return this.operationPassed()
  }

  startReviewCycle(): PreconditionResult {
    if (this.state.currentStateMachineState !== 'REVIEWING') {
      return this.operationFailed('A review cycle can only start in REVIEWING.')
    }
    if (this.state.reviewCycleOpen) return this.operationFailed('A review cycle is already open.')
    const includedReviewers: string[] = []
    const excludedReviewers: Record<string, string> = {}
    for (const reviewer of REVIEW_RUNNERS) {
      const status = this.state.reviewerStatuses.statusFor(ReviewerValue.fromName(reviewer))
      if (status?.isApproved() === true) {
        excludedReviewers[reviewer] = 'already-approved'
        continue
      }
      includedReviewers.push(reviewer)
    }
    this.append(
      ReviewCycleStarted.parse({
        type: 'review-cycle-started',
        at: this.deps.now(),
        cycleNumber: this.state.reviewCycleNumber + 1,
        includedReviewers,
        excludedReviewers,
      }),
    )
    return this.operationPassed()
  }

  waitForCodeRabbitAndCloseReviewCycle(): PreconditionResult {
    const gate = this.operationGate('wait-for-coderabbit-and-close-review-cycle')
    if (!gate.pass) return gate
    if (!this.state.reviewCycleOpen) return this.operationFailed('No review cycle is open.')
    const feedback = waitForCodeRabbitCompletion(this.deps, this.getPullRequestNumber())
    const outcomes = reviewCycleOutcomes(feedback, this.state.includedReviewers)
    const statuses = Object.values(outcomes)
    if (statuses.includes('PENDING')) {
      return this.operationFailed('Every reviewer must return a result before the review cycle can close.')
    }
    const hasOpenFeedback = statuses.includes('OPEN_FEEDBACK')
    this.append(
      ReviewCycleClosed.parse({
        type: 'review-cycle-closed',
        at: this.deps.now(),
        cycleNumber: this.state.reviewCycleNumber,
        reviewedCommit: this.deps.getGitInfo().headCommit,
        outcomes,
      }),
    )
    const capReached = REVIEW_CYCLE_LIMIT.isReached(this.state.reviewCycleNumber)
    if (hasOpenFeedback && !capReached) return this.transition('ADDRESSING_FEEDBACK')
    return this.transition('HUMAN_REVIEWING', {
      reviewCycleCapReached: hasOpenFeedback && capReached,
    })
  }

  transition(
    target: WorkflowStateNameValue,
    stateOverrides?: Readonly<Record<string, unknown>>,
  ): PreconditionResult {
    const current = this.state.currentStateName()
    const definition = this.registryDefinition.state(current)
    if (!definition.canTransitionTo.includes(target))
      return this.operationFailed(`Illegal transition ${current.name()} -> ${target}.`)
    if (definition.transitionGuard !== undefined) {
      const guard = definition.transitionGuard(
        WorkflowTransitionContext.from({
          state: this.state,
          from: current.name(),
          to: target,
          gitInfo: this.deps.getGitInfo(),
        }),
      )
      if (!guard.pass) return guard
    }
    this.append(
      Transitioned.parse({
        type: 'transitioned',
        at: this.deps.now(),
        from: current.name(),
        to: target,
        ...(stateOverrides === undefined ? {} : { stateOverrides }),
      }),
    )
    return this.operationPassed()
  }

  reviewOutcome(options: { readonly ignoreCodeRabbit?: boolean } = {}): AggregateReviewOutcome {
    const statuses = [...this.state.reviewerStatuses.statusByReviewer()]
      .filter(
        ([reviewer]) => !(options.ignoreCodeRabbit === true && reviewer.name() === 'coderabbit'),
      )
      .map(([, status]) => status)
    if (statuses.some((status) => status.isOpenFeedback()))
      return AggregateReviewOutcome.fromName('OPEN_FEEDBACK')
    if (statuses.some((status) => status.isPending()))
      return AggregateReviewOutcome.fromName('PENDING')
    return AggregateReviewOutcome.fromName('APPROVED')
  }
  private append(event: WorkflowEvent): void {
    this.pendingEvents = [...this.pendingEvents, event]
    this.state = this.state.apply(event)
  }
}

function formatSection(heading: string, content: string): string {
  return [`## ${heading}`, content].join('\n\n')
}

const REVIEW_RUNNERS = ['architecture-review', 'code-review', 'bug-scanner', 'task-check'] as const
const REVIEW_CYCLE_LIMIT = ReviewCycleLimit.singleton()
const CODERABBIT_POLL_INTERVAL_MS = 15_000
const MAX_REVIEW_COMPLETION_POLLS = 120

function waitForCodeRabbitCompletion(
  deps: WorkflowDependencies,
  prNumber: number,
  remainingPolls: number = MAX_REVIEW_COMPLETION_POLLS,
): ReturnType<ReadWorkflowPullRequestFeedback> {
  const feedback = deps.getPrFeedback(prNumber)
  if (feedback.coderabbitReviewSeen || feedback.coderabbitRateLimited) return feedback
  if (remainingPolls === 1) return feedback
  deps.sleepMs(CODERABBIT_POLL_INTERVAL_MS)
  return waitForCodeRabbitCompletion(deps, prNumber, remainingPolls - 1)
}

function reviewCycleOutcomes(
  feedback: ReturnType<ReadWorkflowPullRequestFeedback>,
  includedReviewers: readonly string[],
): Readonly<Record<string, string>> {
  const outcomes: Record<string, string> = {}
  for (const reviewer of REVIEW_RUNNERS) {
    if (!includedReviewers.includes(reviewer)) continue
    outcomes[reviewer] = feedback.reviewerStatuses[reviewer]
  }
  outcomes['coderabbit'] = codeRabbitOutcome(feedback)
  return outcomes
}

function codeRabbitOutcome(
  feedback: ReturnType<ReadWorkflowPullRequestFeedback>,
): 'PENDING' | 'RATE_LIMITED' | 'OPEN_FEEDBACK' | 'APPROVED' {
  if (feedback.coderabbitRateLimited) return 'RATE_LIMITED'
  if (!feedback.coderabbitReviewSeen) return 'PENDING'
  const hasOpenCodeRabbitThread = feedback.threads.some(
    (thread) =>
      !thread.isResolved &&
      !thread.isOutdated &&
      thread.comments.some(
        (comment) =>
          comment.author?.login === 'coderabbitai' || comment.author?.login === 'coderabbitai[bot]',
      ),
  )
  return hasOpenCodeRabbitThread ? 'OPEN_FEEDBACK' : 'APPROVED'
}

function normalisePullRequestSubject(subject: string): string {
  return subject.charAt(0).toLowerCase() + subject.slice(1)
}
