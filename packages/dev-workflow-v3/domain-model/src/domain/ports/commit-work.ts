/**
 * @riviere-role domain-port
 * @riviere-role-justification The workflow commits the worktree and needs the commit that was created.
 */
export type CommitWork = (request: {
  readonly worktreePath: string
  readonly message: string
}) => Promise<{ readonly sha: string }>
