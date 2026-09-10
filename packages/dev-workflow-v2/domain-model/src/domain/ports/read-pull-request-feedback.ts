/**
 * @riviere-role domain-port
 * @riviere-role-justification MaintainerWorkflow reads current pull request feedback through this capability when evaluating workflow behaviour. The feedback is not previously created workflow state.
 */
export type ReadWorkflowPullRequestFeedback = (prNumber: number) => {
  readonly reviewerStatuses: Readonly<
    Record<
      'architecture-review' | 'code-review' | 'bug-scanner' | 'task-check' | 'coderabbit',
      'PENDING' | 'OPEN_FEEDBACK' | 'APPROVED'
    >
  >
  readonly reviewDecision: string | null
  readonly coderabbitReviewSeen: boolean
  readonly coderabbitRateLimited?: boolean
  readonly unresolvedCount: number
  readonly threads: readonly {
    readonly id: string
    readonly isResolved: boolean
    readonly isOutdated: boolean
    readonly path: string | null
    readonly line: number | null
    readonly comments: readonly {
      readonly author: { readonly login: string } | null
      readonly body: string
      readonly url?: string
    }[]
  }[]
}
