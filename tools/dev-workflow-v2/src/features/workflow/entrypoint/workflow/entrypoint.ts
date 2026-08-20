import type { CreateWorkflowRoutes } from '@living-architecture/dev-workflow-v2-use-cases/commands/create-workflow-routes'
import { CreatePullRequest } from '@living-architecture/dev-workflow-v2-use-cases/commands/create-pull-request'
import { RecordBranch } from '@living-architecture/dev-workflow-v2-use-cases/commands/record-branch'
import { RecordCiFailed } from '@living-architecture/dev-workflow-v2-use-cases/commands/record-ci-failed'
import { RecordCiPassed } from '@living-architecture/dev-workflow-v2-use-cases/commands/record-ci-passed'
import { RecordIssue } from '@living-architecture/dev-workflow-v2-use-cases/commands/record-issue'
import { RecordPullRequest } from '@living-architecture/dev-workflow-v2-use-cases/commands/record-pull-request'
import { VerifyFeedbackAddressed } from '@living-architecture/dev-workflow-v2-use-cases/commands/verify-feedback-addressed'
import {
  parseNumberArgument,
  parseOptionalStringArgument,
  parseStringArgument,
  parseStringArguments,
} from './workflow-route-inputs'

/** @riviere-role cli-entrypoint-dependencies */
export interface CreateWorkflowRoutesEntrypointDependencies {
  readonly createWorkflowRoutes: CreateWorkflowRoutes
  readonly parseNumberArgument: typeof parseNumberArgument
  readonly parseStringArgument: typeof parseStringArgument
  readonly parseOptionalStringArgument: typeof parseOptionalStringArgument
  readonly parseStringArguments: typeof parseStringArguments
}

/** @riviere-role cli-entrypoint */
export function createWorkflowRoutes(dependencies: CreateWorkflowRoutesEntrypointDependencies) {
  return dependencies.createWorkflowRoutes.execute({
    parseNumberArgument: dependencies.parseNumberArgument,
    parseStringArgument: dependencies.parseStringArgument,
    parseOptionalStringArgument: dependencies.parseOptionalStringArgument,
    parseStringArguments: dependencies.parseStringArguments,
    recordIssue: (workflow, issueNumber) =>
      new RecordIssue(workflow).execute({ issueNumber }).result,
    recordBranch: (workflow, branch) => new RecordBranch(workflow).execute({ branch }).result,
    recordPullRequest: (workflow, number, url) =>
      new RecordPullRequest(workflow).execute({ number, url }).result,
    createPullRequest: (workflow, args) =>
      new CreatePullRequest(workflow).execute({ arguments: args }).result,
    recordCiPassed: (workflow) => new RecordCiPassed(workflow).execute({}).result,
    recordCiFailed: (workflow, output) => new RecordCiFailed(workflow).execute({ output }).result,
    verifyFeedbackAddressed: (workflow) => new VerifyFeedbackAddressed(workflow).execute({}).result,
  }).routes
}
