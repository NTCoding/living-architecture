import type { CreateWorkflowRoutes } from '@living-architecture/dev-workflow-v2-use-cases/commands/create-workflow-routes'
import type { formatPullRequestDetailsFailure } from './format-pull-request-details-failure'
import type { parsePullRequestDescriptionOptions } from './pull-request-description-input'
import {
  parseNumberArgument,
  parseStringArgument,
  parseStringArguments,
} from './workflow-route-inputs'

/** @riviere-role cli-entrypoint-dependencies */
export interface CreateWorkflowRoutesEntrypointDependencies {
  readonly createWorkflowRoutes: CreateWorkflowRoutes
  readonly parseNumberArgument: typeof parseNumberArgument
  readonly parseStringArgument: typeof parseStringArgument
  readonly parseStringArguments: typeof parseStringArguments
  readonly parsePullRequestDescriptionOptions: typeof parsePullRequestDescriptionOptions
  readonly formatPullRequestDetailsFailure: typeof formatPullRequestDetailsFailure
}

/** @riviere-role cli-entrypoint */
export function createWorkflowRoutes(dependencies: CreateWorkflowRoutesEntrypointDependencies) {
  return dependencies.createWorkflowRoutes.execute({
    parseNumberArgument: dependencies.parseNumberArgument,
    parseStringArgument: dependencies.parseStringArgument,
    parseStringArguments: dependencies.parseStringArguments,
    recordIssue: (workflow, issueNumber) => workflow.executeRecording('record-issue', issueNumber),
    recordBranch: (workflow, branch) => workflow.executeRecording('record-branch', branch),
    recordReviewerStatus: (workflow, reviewer, status) =>
      workflow.recordReviewerStatus(reviewer, status),
    parsePullRequestDescriptionOptions: dependencies.parsePullRequestDescriptionOptions,
    formatPullRequestDetailsFailure: dependencies.formatPullRequestDetailsFailure,
  }).routes
}
