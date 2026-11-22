/**
 * @riviere-role domain-port
 * @riviere-role-justification The plan is written for a person to read where the work lives, so the workflow posts it as a comment on the issue. The comment timestamp is returned so a later step can tell which reply came after the plan.
 */
export type CommentOnIssue = (request: {
  readonly issueNumber: number
  readonly body: string
}) => Promise<{
  readonly commentId: number
  readonly createdAt: string
}>
