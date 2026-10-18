/**
 * @riviere-role domain-port
 * @riviere-role-justification The agent commits the work itself, so the workflow needs to read whether the worktree is clean, whether the branch has moved past the base, and which files changed since a given commit. These are current external facts, not restored state.
 */
export type CheckWorkCommitted = (request: {
  readonly worktreePath: string
  readonly from: string | null
}) => Promise<{
  readonly clean: boolean
  readonly hasCommit: boolean
  readonly sha: string
  readonly status: string
  readonly changedFiles: readonly string[]
}>
