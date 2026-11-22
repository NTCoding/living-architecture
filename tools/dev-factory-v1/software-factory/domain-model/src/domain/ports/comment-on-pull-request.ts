/**
 * @riviere-role domain-port
 * @riviere-role-justification The workflow tells the pull request that the work is ready for a person. This is an external action, not a domain decision.
 */
export type CommentOnPullRequest = (request: {
  readonly pullRequestNumber: number
  readonly body: string
}) => Promise<void>
