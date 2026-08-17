import { arg, defineRoutes } from '@nt-ai-lab/deterministic-agent-workflow-cli'
import { CreatePullRequest } from '@living-architecture/dev-workflow-v2-use-cases/commands/create-pull-request'
import { RecordBranch } from '@living-architecture/dev-workflow-v2-use-cases/commands/record-branch'
import { RecordCiFailed } from '@living-architecture/dev-workflow-v2-use-cases/commands/record-ci-failed'
import { RecordCiPassed } from '@living-architecture/dev-workflow-v2-use-cases/commands/record-ci-passed'
import { RecordIssue } from '@living-architecture/dev-workflow-v2-use-cases/commands/record-issue'
import { RecordPullRequest } from '@living-architecture/dev-workflow-v2-use-cases/commands/record-pull-request'
import { VerifyFeedbackAddressed } from '@living-architecture/dev-workflow-v2-use-cases/commands/verify-feedback-addressed'
import type { WorkflowStateSchemaProvider } from './workflow-state-schema-provider'

type RoutedWorkflow = ConstructorParameters<typeof RecordIssue>[0]
type RoutedWorkflowState = ReturnType<RoutedWorkflow['getState']>

/** @riviere-role cli-entrypoint-dependencies */
export interface CreateWorkflowRoutesEntrypointDependencies {
  readonly schemaProvider: WorkflowStateSchemaProvider
  readonly defineRoutes: typeof defineRoutes
  readonly parseNumberArgument: (value: unknown) => number
  readonly parseStringArgument: (value: unknown) => string
  readonly parseOptionalStringArgument: (value: unknown) => string | undefined
  readonly parseStringArguments: (value: unknown) => readonly string[]
}

/** @riviere-role cli-entrypoint */
export function createWorkflowRoutes(dependencies: CreateWorkflowRoutesEntrypointDependencies) {
  const stateNameSchema = dependencies.schemaProvider.stateNameSchema()
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
        }),
    },
    'record-branch': {
      type: 'transaction',
      args: [arg.string('branch')],
      handler: (workflow, branch) =>
        new RecordBranch(workflow).execute({ branch: dependencies.parseStringArgument(branch) }),
    },
    'record-pr': {
      type: 'transaction',
      args: [arg.number('number'), arg.string('url').optional()],
      handler: (workflow, number, url) =>
        new RecordPullRequest(workflow).execute({
          number: dependencies.parseNumberArgument(number),
          url: dependencies.parseOptionalStringArgument(url),
        }),
    },
    'create-pr': {
      type: 'transaction',
      args: [arg.rest()],
      handler: (workflow, args) =>
        new CreatePullRequest(workflow).execute({
          arguments: dependencies.parseStringArguments(args),
        }),
    },
    'record-ci-passed': {
      type: 'transaction',
      args: [],
      handler: (workflow) => new RecordCiPassed(workflow).execute({}),
    },
    'record-ci-failed': {
      type: 'transaction',
      args: [arg.string('output')],
      handler: (workflow, output) =>
        new RecordCiFailed(workflow).execute({ output: dependencies.parseStringArgument(output) }),
    },
    'verify-feedback-addressed': {
      type: 'transaction',
      args: [],
      handler: (workflow) => new VerifyFeedbackAddressed(workflow).execute({}),
    },
  })
}
