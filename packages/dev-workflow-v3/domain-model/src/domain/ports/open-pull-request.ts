/**
 * @riviere-role domain-port
 * @riviere-role-justification The workflow creates the pull request and needs its number and url for every later step.
 */
export type OpenPullRequest = (request: {
  readonly worktreePath: string
  readonly branch: string
  readonly title: string
  readonly body: string
}) => Promise<{ readonly number: number; readonly url: string }>
