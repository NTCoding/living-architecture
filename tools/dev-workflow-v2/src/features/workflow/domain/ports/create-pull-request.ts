import type { PullRequestCreationRequest } from '../pull-request-description'
import type { WorkflowPullRequest } from '../pull-request'

/** @riviere-role domain-port */
export type CreateWorkflowPullRequest = (request: PullRequestCreationRequest) => WorkflowPullRequest
