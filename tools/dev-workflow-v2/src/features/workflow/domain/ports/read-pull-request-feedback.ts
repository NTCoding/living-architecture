/** @riviere-role domain-port */
export type ReadWorkflowPullRequestFeedback = (prNumber: number) => {
  readonly reviewDecision: string | null
  readonly coderabbitReviewSeen: boolean
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
