import type { WorkflowState } from '../workflow-types'

/** @riviere-role domain-port
 * @riviere-role-justification Reviewer names are an invocation contract for an external review capability.
 */
export type ReviewAgentName = 'architecture-review' | 'code-review' | 'bug-scanner' | 'task-check'

/** @riviere-role domain-port
 * @riviere-role-justification Review launch requests describe the external review action the aggregate asks infrastructure to perform.
 */
export type ReviewLaunchRequest = {
  readonly pullRequestNumber: number
  readonly reviewer: ReviewAgentName
  readonly workflowState: WorkflowState
}

/** @riviere-role domain-port
 * @riviere-role-justification Launching reviewers performs an external action during review; it does not load previously created workflow state.
 */
export interface ReviewLauncher {
  run(requests: readonly ReviewLaunchRequest[]): void
}
