/**
 * @riviere-role domain-port
 * @riviere-role-justification MaintainerWorkflow pushes the feature branch recorded in workflow state through this capability.
 */
export type PushWorkflowFeatureBranch = (branch: string) => void
