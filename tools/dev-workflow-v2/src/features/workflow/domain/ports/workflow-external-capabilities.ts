import type { PullRequestCreationRequest } from '../pull-request-description'

interface WorkflowGitStatus {
  changedFilesVsDefault: readonly string[]
  currentBranch: string
  hasCommitsVsDefault: boolean
  headCommit: string
  workingTreeClean: boolean
}

/** @riviere-role domain-port */
export type ReadWorkflowGitStatus = () => WorkflowGitStatus

interface WorkflowPullRequest {
  readonly prNumber: number
  readonly prUrl: string
  readonly isDraft: boolean
}

/** @riviere-role domain-port */
export type CreateWorkflowPullRequest = (request: PullRequestCreationRequest) => WorkflowPullRequest

/** @riviere-role domain-port */
export interface WorkflowUnresolvedPullRequestThread {
  readonly id: string
  readonly isResolved: boolean
  readonly isOutdated: boolean
  readonly path: string | null
  readonly line: number | null
  readonly comments: readonly {
    author: { login: string } | null
    body: string
    url?: string
  }[]
}

/** @riviere-role domain-port */
export interface WorkflowPullRequestFeedback {
  readonly reviewDecision: string | null
  readonly coderabbitReviewSeen: boolean
  readonly unresolvedCount: number
  readonly threads: readonly WorkflowUnresolvedPullRequestThread[]
}

/** @riviere-role domain-port */
export type ReadWorkflowPullRequestFeedback = (prNumber: number) => WorkflowPullRequestFeedback
