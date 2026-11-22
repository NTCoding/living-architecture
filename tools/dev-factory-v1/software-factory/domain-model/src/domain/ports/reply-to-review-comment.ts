/**
 * @riviere-role domain-port
 * @riviere-role-justification The workflow answers each review finding on the pull request so a person can see that it was addressed. This is an external action, not a domain decision.
 */
export type ReplyToReviewComment = (request: {
  readonly pullRequestNumber: number
  readonly commentId: number
  readonly body: string
}) => Promise<void>
