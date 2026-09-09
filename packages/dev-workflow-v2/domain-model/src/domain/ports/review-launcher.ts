import type { WorkflowState } from '../workflow-types'

/** @riviere-role domain-port */
export type ReviewAgentName = 'architecture-review' | 'code-review' | 'bug-scanner' | 'task-check'

/** @riviere-role domain-port */
export type ReviewLaunchRequest = {
  readonly pullRequestNumber: number
  readonly reviewer: ReviewAgentName
  readonly workflowState: WorkflowState
}

/** @riviere-role domain-port */
/** @riviere-role domain-port
 * @riviere-role-justification Launching reviewers performs an external action during review; it does not load previously created workflow state.
 */
export interface ReviewLauncher {
  run(requests: readonly ReviewLaunchRequest[]): void
}
