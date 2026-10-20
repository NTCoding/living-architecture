/**
 * @riviere-role domain-port
 * @riviere-role-justification The reviewers read the change under review. The diff is a current external fact, not restored aggregate state.
 */
export type ReadPullRequestDiff = (request: {
  readonly pullRequestNumber: number
}) => Promise<{ readonly diff: string }>
