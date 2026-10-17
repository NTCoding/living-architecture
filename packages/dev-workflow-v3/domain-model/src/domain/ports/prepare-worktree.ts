/**
 * @riviere-role domain-port
 * @riviere-role-justification The workflow creates a branch and a worktree for an issue, which is an external action whose result is where the agent will work.
 */
export type PrepareWorktree = (request: {
  readonly worktreePath: string
  readonly branch: string
}) => Promise<void>
