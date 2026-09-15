import type { StoredReview } from '@nt-ai-lab/deterministic-agent-workflow-engine'
import type { CreateWorkflowPullRequest } from './ports/create-pull-request'
import type { ReadWorkflowGitStatus } from './ports/read-git-status'
import type { ReadWorkflowPullRequestFeedback } from './ports/read-pull-request-feedback'

type ListSessionReviews = () => readonly StoredReview[]
type SleepMilliseconds = (milliseconds: number) => void
type CurrentTime = () => string

interface WorkflowDependenciesInput {
  readonly getGitInfo: ReadWorkflowGitStatus
  readonly getPrFeedback: ReadWorkflowPullRequestFeedback
  readonly createPullRequest: CreateWorkflowPullRequest
  readonly listSessionReviews: ListSessionReviews
  readonly sleepMs: SleepMilliseconds
  readonly now: CurrentTime
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
  ) {}

  static from(input: WorkflowDependenciesInput): WorkflowDependencies {
    return new WorkflowDependencies(
      input.getGitInfo,
      input.getPrFeedback,
      input.createPullRequest,
      input.listSessionReviews,
      input.sleepMs,
      input.now,
    )
  }
}
