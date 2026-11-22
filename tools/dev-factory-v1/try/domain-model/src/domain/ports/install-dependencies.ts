/**
 * @riviere-role domain-port
 * @riviere-role-justification A fresh worktree has no installed dependencies, so the checks cannot run until they are installed. This is an external action, not restored state.
 */
export type InstallDependencies = (request: { readonly worktreePath: string }) => Promise<void>
