/**
 * @riviere-role domain-port
 * @riviere-role-justification The agent commits the work itself, so the workflow needs to read whether the worktree is clean and whether the branch has moved past the base. This is a current external fact, not restored state.
 */
export type CheckWorkCommitted = (request: { readonly worktreePath: string }) => Promise<{
  readonly clean: boolean
  readonly hasCommit: boolean
  readonly sha: string
  readonly status: string
}>
