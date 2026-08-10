import type { WorkflowGitStatus } from '../git-status'

/** @riviere-role domain-port */
export type ReadWorkflowGitStatus = () => WorkflowGitStatus
