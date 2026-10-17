/**
 * @riviere-role domain-port
 * @riviere-role-justification The workflow reads the feedback that has arrived on the pull request so far, which is a current external fact.
 */
export type ReadPullRequestFeedback = (request: { readonly pullRequestNumber: number }) => Promise<{
  readonly reviewSeen: boolean
  readonly rateLimited: boolean
  readonly comments: readonly {
    readonly path: string
    readonly line: number
    readonly body: string
  }[]
}>
