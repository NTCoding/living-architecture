import type { CreateWorkflowRoutes } from '@living-architecture/dev-workflow-v2-use-cases/commands/create-workflow-routes'
import { parseNumberArgument, parseStringArgument } from './workflow-route-inputs'

/** @riviere-role cli-entrypoint-dependencies */
export interface CreateWorkflowRoutesEntrypointDependencies {
  readonly createWorkflowRoutes: CreateWorkflowRoutes
  readonly parseNumberArgument: typeof parseNumberArgument
  readonly parseStringArgument: typeof parseStringArgument
}

/** @riviere-role cli-entrypoint */
export function createWorkflowRoutes(dependencies: CreateWorkflowRoutesEntrypointDependencies) {
  return dependencies.createWorkflowRoutes.execute({
    parseNumberArgument: dependencies.parseNumberArgument,
    parseStringArgument: dependencies.parseStringArgument,
    recordIssue: (workflow, issueNumber) => workflow.executeRecording('record-issue', issueNumber),
    recordBranch: (workflow, branch) => workflow.executeRecording('record-branch', branch),
    recordReviewerStatus: (workflow, reviewer, status) =>
      workflow.recordReviewerStatus(reviewer, status),
  }).routes
}
