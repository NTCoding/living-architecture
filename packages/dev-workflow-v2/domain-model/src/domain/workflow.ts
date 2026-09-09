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
import { WorkflowState } from './workflow-types'
import { MaintainerWorkflowRegistry } from './registry'
import type { CreateWorkflowPullRequest } from './ports/create-pull-request'
import type { ReadWorkflowGitStatus } from './ports/read-git-status'
import type { ReadWorkflowPullRequestFeedback } from './ports/read-pull-request-feedback'
import type { WorkflowEvent } from './workflow-events'
import { parseWorkflowEvent } from './workflow-events'
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
type WorkflowOperation = keyof typeof RECORDING_OPS_MAP | 'record-reviewer-status'
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
  readonly emitEvent: (event: WorkflowEvent, state: WorkflowState) => void
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
      REVIEWING: registry.REVIEWING.withEntryContext({ workflow: this, deps }),
      SUBMITTING_PR: registry.SUBMITTING_PR.withEntryContext({ workflow: this, deps }),
    })
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
  }
  startSession(transcriptPath: string, repository: string | undefined): void {
    const event: WorkflowEvent = {
      type: 'session-started',
      at: this.deps.now(),
      transcriptPath,
      ...(repository === undefined ? {} : { repository }),
    }
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
  executeRecording(op: WorkflowOperation, ...args: readonly unknown[]): PreconditionResult {
    const recordingOps = defineRecordingOps<StateName, WorkflowState, WorkflowOperation>(
      this.registryDefinition,
      RECORDING_OPS_MAP,
    )
    const result = recordingOps.executeOp(op, this.state, this.deps.now(), args)
    if (!result.pass) return fail(result.reason)
    this.appendEvent(result.event)
    return pass()
  }

  recordReviewerStatus(
    reviewer: 'architecture-review' | 'code-review' | 'bug-scanner' | 'task-check' | 'coderabbit',
    status: 'PENDING' | 'OPEN_FEEDBACK' | 'APPROVED',
  ): PreconditionResult {
    const gate = checkOperationGate('record-reviewer-status', this.state, this.registryDefinition)
    if (!gate.pass) return gate
    this.append({ type: 'reviewer-status-recorded', at: this.deps.now(), reviewer, status })
    return pass()
  }
  private append(event: WorkflowEvent): void {
    this.pendingEvents = [...this.pendingEvents, event]
    this.state = this.state.apply(event)
  }
}
