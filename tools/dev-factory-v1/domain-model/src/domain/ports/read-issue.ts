/**
 * @riviere-role domain-port
 * @riviere-role-justification The workflow reads the issue from GitHub at the start of a run. The result is the current external fact the planning step needs, not restored aggregate state.
 */
export type ReadIssue = (issueNumber: number) => Promise<{
  readonly title: string
  readonly body: string
}>
