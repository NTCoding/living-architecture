/**
 * @riviere-role domain-port
 * @riviere-role-justification MaintainerWorkflow invokes the repository's required local checks against the current worktree. This executes an external capability, not a loader for prior aggregate state.
 */
export type RunLocalVerification = () => void
