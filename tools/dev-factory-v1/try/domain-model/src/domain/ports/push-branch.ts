/**
 * @riviere-role domain-port
 * @riviere-role-justification The workflow pushes the branch, and this is the only place a push happens. The agent is never given this capability.
 */
export type PushBranch = (request: {
  readonly worktreePath: string
  readonly branch: string
}) => Promise<void>
