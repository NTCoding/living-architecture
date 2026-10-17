/**
 * @riviere-role domain-port
 * @riviere-role-justification The workflow runs lint, typecheck, test and role check in the worktree. The result is the current outcome of running them, not stored state.
 */
export type RunProjectChecks = (request: { readonly worktreePath: string }) => Promise<{
  readonly checks: readonly { readonly name: string; readonly passed: boolean }[]
}>
