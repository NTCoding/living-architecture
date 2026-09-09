import type { WorkflowState } from '../workflow-types'

export type ReviewAgentName = 'architecture-review' | 'code-review' | 'bug-scanner' | 'task-check'

export type ReviewLaunchRequest = {
  readonly pullRequestNumber: number
  readonly reviewer: ReviewAgentName
  readonly workflowState: WorkflowState
}

/** @riviere-role domain-port */
export interface ReviewLauncher {
  run(requests: readonly ReviewLaunchRequest[]): void
}
