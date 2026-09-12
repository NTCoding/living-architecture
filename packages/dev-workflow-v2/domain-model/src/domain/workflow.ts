import type {
  PreconditionResult,
  RecordingOpDefinition,
} from '@nt-ai-lab/deterministic-agent-workflow-dsl'
import {
  pass,
  fail,
  defineRecordingOps,
  checkOperationGate,
} from '@nt-ai-lab/deterministic-agent-workflow-dsl'
import type { BaseEvent, StoredReview } from '@nt-ai-lab/deterministic-agent-workflow-engine'
import { WorkflowStateError } from '@nt-ai-lab/deterministic-agent-workflow-engine'
import { getInitialWorkflowState, WorkflowState } from './workflow-types'
import type { PullRequestCreationDetails } from './pull-request-description'
import { MaintainerWorkflowRegistry } from './registry'
import { ReviewingState } from './states/reviewing'
import { SubmittingPrState } from './states/submitting-pr'
import type { CreateWorkflowPullRequest } from './ports/create-pull-request'
import type { ReadWorkflowGitStatus } from './ports/read-git-status'
import type { ReadWorkflowPullRequestFeedback } from './ports/read-pull-request-feedback'
import type { Reviewer } from './reviews/reviewers'
import type { ReviewerStatus } from './reviews/statuses'
import type { WorkflowEvent } from './workflow-events'
import {
  parseWorkflowEvent,
  PrRecorded,
  ReviewerStatusRecorded,
  SessionStarted,
  Transitioned,
} from './workflow-events'
import { WorkflowTransitionContext } from './workflow-transition-context'
type StateName = WorkflowState['currentStateMachineState']
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
/** @riviere-role domain-port
 * @riviere-role-justification Review outcome is the aggregate's contract for the result of evaluating external reviewer statuses.
 */
export type ReviewOutcome = 'PENDING' | 'OPEN_FEEDBACK' | 'APPROVED'
/** @riviere-role domain-port
 * @riviere-role-justification The aggregate receives current Git and GitHub capabilities at construction time; they are external observations and effects, not previously created workflow state.
 */
export type WorkflowDeps = {
  readonly getGitInfo: ReadWorkflowGitStatus
  readonly getPrFeedback: ReadWorkflowPullRequestFeedback
  readonly createPullRequest: CreateWorkflowPullRequest
  readonly listSessionReviews: () => readonly StoredReview[]
  readonly sleepMs: (milliseconds: number) => void
  readonly now: () => string
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
    this.deps = deps
    this.registryDefinition = MaintainerWorkflowRegistry.parse({
      ...registry,
      REVIEWING: ReviewingState.parse('REVIEWING', { workflow: this, deps }),
      SUBMITTING_PR: SubmittingPrState.parse('SUBMITTING_PR'),
    })
  }
  static build(
    registry: MaintainerWorkflowRegistry,
    deps: WorkflowDeps,
    state: unknown = getInitialWorkflowState(),
  ): MaintainerWorkflow {
    return new MaintainerWorkflow(WorkflowState.parse(state), registry, deps)
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
    return `${pluginRoot}/${this.registryDefinition.state(this.state.currentStateMachineState).agentInstructions}`
  }
  appendEvent(event: BaseEvent): void {
    const workflowEvent = parseWorkflowEvent(event)
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
    return pass()
  }
  handleTeammateIdle(agentName: string): PreconditionResult {
    void agentName
    return pass()
  }
  executeRecording(op: RecordingOperation, ...args: readonly unknown[]): PreconditionResult {
    const recordingOps = defineRecordingOps<StateName, WorkflowState, RecordingOperation>(
      this.registryDefinition,
      RECORDING_OPS_MAP,
    )
    const result = recordingOps.executeOp(op, this.state, this.deps.now(), args)
    if (!result.pass) return fail(result.reason)
    this.appendEvent(result.event)
    return pass()
  }

  recordReviewerStatus(
    reviewer: Reviewer,
    status: ReturnType<ReviewerStatus['name']>,
  ): PreconditionResult {
    const gate = checkOperationGate('record-reviewer-status', this.state, this.registryDefinition)
    if (!gate.pass) return gate
    this.append(
      ReviewerStatusRecorded.parse({
        type: 'reviewer-status-recorded',
        at: this.deps.now(),
        reviewer: reviewer.name(),
        status,
      }),
    )
    return pass()
  }

  createPr(input: PullRequestCreationDetails): PreconditionResult {
    const gate = checkOperationGate('create-pr', this.state, this.registryDefinition)
    if (!gate.pass) return gate
    if (this.state.prNumber !== undefined) {
      return fail('A pull request has already been recorded for this workflow.')
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
      return pass()
    } catch (error) {
      return fail(`Unable to create PR: ${String(error)}`)
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
    return pass()
  }

  transition(target: StateName): PreconditionResult {
    const current = this.state.currentStateMachineState
    const definition = this.registryDefinition.state(current)
    if (!definition.canTransitionTo.includes(target))
      return fail(`Illegal transition ${current} -> ${target}.`)
    if (definition.transitionGuard !== undefined) {
      const guard = definition.transitionGuard(
        WorkflowTransitionContext.from({
          state: this.state,
          from: current,
          to: target,
          gitInfo: this.deps.getGitInfo(),
        }),
      )
      if (!guard.pass) return guard
    }
    this.append(
      Transitioned.parse({ type: 'transitioned', at: this.deps.now(), from: current, to: target }),
    )
    return pass()
  }

  reviewOutcome(options: { readonly ignoreCodeRabbit?: boolean } = {}): ReviewOutcome {
    const statuses = [...this.state.reviewerStatuses.statusByReviewer()]
      .filter(
        ([reviewer]) => !(options.ignoreCodeRabbit === true && reviewer.name() === 'coderabbit'),
      )
      .map(([, status]) => status)
    if (statuses.some((status) => status.isOpenFeedback())) return 'OPEN_FEEDBACK'
    if (statuses.some((status) => status.isPending())) return 'PENDING'
    return 'APPROVED'
  }
  private append(event: WorkflowEvent): void {
    this.pendingEvents = [...this.pendingEvents, event]
    this.state = this.state.apply(event)
  }
}

function formatSection(heading: string, content: string): string {
  return [`## ${heading}`, content].join('\n\n')
}

function normalisePullRequestSubject(subject: string): string {
  return subject.charAt(0).toLowerCase() + subject.slice(1)
}
