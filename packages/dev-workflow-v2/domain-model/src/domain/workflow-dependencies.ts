import type { BaseEvent, StoredReview } from '@nt-ai-lab/deterministic-agent-workflow-engine'
import type {
  RecordingOpDefinition,
  RecordingOpsFactory,
  WorkflowRegistry,
} from '@nt-ai-lab/deterministic-agent-workflow-dsl'
import type { CreateWorkflowPullRequest } from './ports/create-pull-request'
import type { ReadWorkflowGitStatus } from './ports/read-git-status'
import type { ReadWorkflowPullRequestFeedback } from './ports/read-pull-request-feedback'
import type { WorkflowEvent } from './workflow-events'
import type { WorkflowState } from './workflow-types'

type ListSessionReviews = () => readonly StoredReview[]
type SleepMilliseconds = (milliseconds: number) => void
type CurrentTime = () => string
type ParseWorkflowEvent = (event: BaseEvent) => WorkflowEvent
type ReadInitialWorkflowState = () => WorkflowState
type BuildRecordingOperations = <
  TStateName extends string,
  TState extends { currentStateMachineState: TStateName },
  TOperation extends string,
>(
  registry: WorkflowRegistry<TState, TStateName, TOperation>,
  operations: Readonly<Record<string, RecordingOpDefinition<readonly never[]>>>,
) => RecordingOpsFactory<TStateName, TState, TOperation>

interface WorkflowDependenciesInput {
  readonly getGitInfo: ReadWorkflowGitStatus
  readonly getPrFeedback: ReadWorkflowPullRequestFeedback
  readonly createPullRequest: CreateWorkflowPullRequest
  readonly listSessionReviews: ListSessionReviews
  readonly sleepMs: SleepMilliseconds
  readonly now: CurrentTime
  readonly parseWorkflowEvent: ParseWorkflowEvent
  readonly readInitialWorkflowState: ReadInitialWorkflowState
  readonly buildRecordingOperations: BuildRecordingOperations
}

/** @riviere-role value-object */
export class WorkflowDependencies {
  declare private readonly brand: 'WorkflowDependencies'

  private constructor(
    readonly getGitInfo: ReadWorkflowGitStatus,
    readonly getPrFeedback: ReadWorkflowPullRequestFeedback,
    readonly createPullRequest: CreateWorkflowPullRequest,
    readonly listSessionReviews: ListSessionReviews,
    readonly sleepMs: SleepMilliseconds,
    readonly now: CurrentTime,
    readonly parseWorkflowEvent: ParseWorkflowEvent,
    readonly readInitialWorkflowState: ReadInitialWorkflowState,
    readonly buildRecordingOperations: BuildRecordingOperations,
  ) {}

  static from(input: WorkflowDependenciesInput): WorkflowDependencies {
    return new WorkflowDependencies(
      input.getGitInfo,
      input.getPrFeedback,
      input.createPullRequest,
      input.listSessionReviews,
      input.sleepMs,
      input.now,
      input.parseWorkflowEvent,
      input.readInitialWorkflowState,
      input.buildRecordingOperations,
    )
  }
}
