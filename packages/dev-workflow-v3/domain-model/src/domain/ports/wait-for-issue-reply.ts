/**
 * @riviere-role domain-port
 * @riviere-role-justification The developer answers a plan question on the issue, so the workflow reads the first comment that arrived after the plan and carries it into implementation. This is a current external fact, not restored state.
 */
export type WaitForIssueReply = (request: {
  readonly issueNumber: number
  readonly after: string
}) => Promise<{ readonly reply: string | null }>
