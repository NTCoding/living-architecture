import type { WorkflowPullRequestFeedback } from '../pull-request-feedback'

/** @riviere-role domain-port */
export type ReadWorkflowPullRequestFeedback = (prNumber: number) => WorkflowPullRequestFeedback
