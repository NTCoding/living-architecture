/** @riviere-role value-object */
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

/** @riviere-role value-object */
export interface WorkflowPullRequestFeedback {
  readonly reviewDecision: string | null
  readonly coderabbitReviewSeen: boolean
  readonly unresolvedCount: number
  readonly threads: readonly WorkflowUnresolvedPullRequestThread[]
}
