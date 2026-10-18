/**
 * @riviere-role domain-port
 * @riviere-role-justification The plan is written for a person to read where the work lives, so the workflow posts it as a comment on the issue. This is an external action, not a domain decision.
 */
export type CommentOnIssue = (request: {
  readonly issueNumber: number
  readonly body: string
}) => Promise<void>
