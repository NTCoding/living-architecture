import { arg } from '@nt-ai-lab/deterministic-agent-workflow-cli'
import { CreatePullRequest } from '@living-architecture/dev-workflow-v2-use-cases/commands/create-pull-request'
import { RecordBranch } from '@living-architecture/dev-workflow-v2-use-cases/commands/record-branch'
import { RecordCiFailed } from '@living-architecture/dev-workflow-v2-use-cases/commands/record-ci-failed'
import { RecordCiPassed } from '@living-architecture/dev-workflow-v2-use-cases/commands/record-ci-passed'
import { RecordIssue } from '@living-architecture/dev-workflow-v2-use-cases/commands/record-issue'
import { RecordPullRequest } from '@living-architecture/dev-workflow-v2-use-cases/commands/record-pull-request'
import { VerifyFeedbackAddressed } from '@living-architecture/dev-workflow-v2-use-cases/commands/verify-feedback-addressed'
import type { defineWorkflowRoutes } from '@living-architecture/dev-workflow-v2-use-cases/external-clients/deterministic-agent-workflow-cli/define-workflow-routes'
import type { ZodSchemaProvider } from '@living-architecture/dev-workflow-v2-use-cases/external-clients/zod/zod-schema-provider'
import type {
  parseNumberArgument,
  parseOptionalStringArgument,
  parseStringArgument,
  parseStringArguments,
} from './workflow-route-inputs'

type RoutedWorkflow = ConstructorParameters<typeof RecordIssue>[0]
type RoutedWorkflowState = ReturnType<RoutedWorkflow['getState']>

/** @riviere-role cli-entrypoint-dependencies */
export interface CreateWorkflowRoutesEntrypointDependencies {
  readonly stateNameSchemaProvider: ZodSchemaProvider<string>
  readonly defineRoutes: typeof defineWorkflowRoutes
  readonly parseNumberArgument: typeof parseNumberArgument
  readonly parseStringArgument: typeof parseStringArgument
  readonly parseOptionalStringArgument: typeof parseOptionalStringArgument
  readonly parseStringArguments: typeof parseStringArguments
}

/** @riviere-role cli-entrypoint */
export function createWorkflowRoutes(dependencies: CreateWorkflowRoutesEntrypointDependencies) {
  const stateNameSchema = dependencies.stateNameSchemaProvider.getSchema()
  return dependencies.defineRoutes<RoutedWorkflow, RoutedWorkflowState>({
    init: { type: 'session-start' },
    transition: {
      type: 'transition',
      args: [arg.state('STATE', stateNameSchema)],
    },
    'record-issue': {
      type: 'transaction',
      args: [arg.number('number')],
      handler: (workflow, issueNumber) =>
        new RecordIssue(workflow).execute({
          issueNumber: dependencies.parseNumberArgument(issueNumber),
        }).result,
    },
    'record-branch': {
      type: 'transaction',
      args: [arg.string('branch')],
      handler: (workflow, branch) =>
        new RecordBranch(workflow).execute({ branch: dependencies.parseStringArgument(branch) })
          .result,
    },
    'record-pr': {
      type: 'transaction',
      args: [arg.number('number'), arg.string('url').optional()],
      handler: (workflow, number, url) =>
        new RecordPullRequest(workflow).execute({
          number: dependencies.parseNumberArgument(number),
          url: dependencies.parseOptionalStringArgument(url),
        }).result,
    },
    'create-pr': {
      type: 'transaction',
      args: [arg.rest()],
      handler: (workflow, args) =>
        new CreatePullRequest(workflow).execute({
          arguments: dependencies.parseStringArguments(args),
        }).result,
    },
    'record-ci-passed': {
      type: 'transaction',
      args: [],
      handler: (workflow) => new RecordCiPassed(workflow).execute({}).result,
    },
    'record-ci-failed': {
      type: 'transaction',
      args: [arg.string('output')],
      handler: (workflow, output) =>
        new RecordCiFailed(workflow).execute({ output: dependencies.parseStringArgument(output) })
          .result,
    },
    'verify-feedback-addressed': {
      type: 'transaction',
      args: [],
      handler: (workflow) => new VerifyFeedbackAddressed(workflow).execute({}).result,
    },
  })
}
