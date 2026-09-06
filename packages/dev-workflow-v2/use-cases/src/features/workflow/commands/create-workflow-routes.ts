import { arg } from '@nt-ai-lab/deterministic-agent-workflow-cli'
import type { defineRoutes } from '@nt-ai-lab/deterministic-agent-workflow-cli'
import type { MaintainerWorkflow as Workflow } from '@living-architecture/dev-workflow-v2-domain-model/domain/workflow'
import type { ZodType } from 'zod'

interface ZodSchemaProvider<T> {
  getSchema(): ZodType<T>
}

type DefineWorkflowRoutes = typeof defineRoutes

type RoutedWorkflow = Workflow
type RoutedWorkflowState = ReturnType<RoutedWorkflow['getState']>

type WorkflowResult = ReturnType<Workflow['executeRecording']>

/** @riviere-role command-use-case-result */
export interface CreateWorkflowRoutesResult {
  readonly routes: ReturnType<typeof defineRoutes<RoutedWorkflow, RoutedWorkflowState>>
}

/** @riviere-role command-use-case-input */
export interface CreateWorkflowRoutesInput {
  readonly parseNumberArgument: (value: unknown) => number
  readonly parseStringArgument: (value: unknown) => string
  readonly parseOptionalStringArgument: (value: unknown) => string | undefined
  readonly parseStringArguments: (value: unknown) => readonly string[]
  readonly recordIssue: (workflow: RoutedWorkflow, issueNumber: number) => WorkflowResult
  readonly recordBranch: (workflow: RoutedWorkflow, branch: string) => WorkflowResult
  readonly recordPullRequest: (
    workflow: RoutedWorkflow,
    number: number,
    url: string | undefined,
  ) => WorkflowResult
  readonly createPullRequest: (workflow: RoutedWorkflow, args: readonly string[]) => WorkflowResult
  readonly recordCiPassed: (workflow: RoutedWorkflow) => WorkflowResult
  readonly recordCiFailed: (workflow: RoutedWorkflow, output: string) => WorkflowResult
  readonly verifyLocal: (workflow: RoutedWorkflow) => WorkflowResult
  readonly verifyFeedbackAddressed: (workflow: RoutedWorkflow) => WorkflowResult
  readonly verifyPrReviewGate: (workflow: RoutedWorkflow) => WorkflowResult
}

/** @riviere-role command-use-case */
export class CreateWorkflowRoutes {
  constructor(
    private readonly stateNameSchemaProvider: ZodSchemaProvider<string>,
    private readonly defineRoutes: DefineWorkflowRoutes,
  ) {}

  execute(input: CreateWorkflowRoutesInput): CreateWorkflowRoutesResult {
    const stateNameSchema = this.stateNameSchemaProvider.getSchema()
    return {
      routes: this.defineRoutes<RoutedWorkflow, RoutedWorkflowState>({
        init: { type: 'session-start' },
        transition: {
          type: 'transition',
          args: [arg.state('STATE', stateNameSchema)],
        },
        'record-issue': {
          type: 'transaction',
          args: [arg.number('number')],
          handler: (workflow, issueNumber) =>
            input.recordIssue(workflow, input.parseNumberArgument(issueNumber)),
        },
        'record-branch': {
          type: 'transaction',
          args: [arg.string('branch')],
          handler: (workflow, branch) =>
            input.recordBranch(workflow, input.parseStringArgument(branch)),
        },
        'record-pr': {
          type: 'transaction',
          args: [arg.number('number'), arg.string('url').optional()],
          handler: (workflow, number, url) =>
            input.recordPullRequest(
              workflow,
              input.parseNumberArgument(number),
              input.parseOptionalStringArgument(url),
            ),
        },
        'create-pr': {
          type: 'transaction',
          args: [arg.rest()],
          handler: (workflow, args) =>
            input.createPullRequest(workflow, input.parseStringArguments(args)),
        },
        'record-ci-passed': {
          type: 'transaction',
          args: [],
          handler: (workflow) => input.recordCiPassed(workflow),
        },
        'record-ci-failed': {
          type: 'transaction',
          args: [arg.string('output')],
          handler: (workflow, output) =>
            input.recordCiFailed(workflow, input.parseStringArgument(output)),
        },
        'verify-local': {
          type: 'transaction',
          args: [],
          handler: (workflow) => input.verifyLocal(workflow),
        },
        'verify-feedback-addressed': {
          type: 'transaction',
          args: [],
          handler: (workflow) => input.verifyFeedbackAddressed(workflow),
        },
        'verify-pr-review-gate': {
          type: 'transaction',
          args: [],
          handler: (workflow) => input.verifyPrReviewGate(workflow),
        },
      }),
    }
  }
}
