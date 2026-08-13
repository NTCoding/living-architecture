import { arg, defineRoutes } from '@nt-ai-lab/deterministic-agent-workflow-cli'
import type { ZodType } from 'zod'
import { CreatePullRequest } from '../../commands/create-pull-request'
import { RecordBranch } from '../../commands/record-branch'
import { RecordCiFailed } from '../../commands/record-ci-failed'
import { RecordCiPassed } from '../../commands/record-ci-passed'
import { RecordIssue } from '../../commands/record-issue'
import { RecordPullRequest } from '../../commands/record-pull-request'
import { VerifyFeedbackAddressed } from '../../commands/verify-feedback-addressed'
import {
  parseNumberArgument,
  parseOptionalStringArgument,
  parseStringArgument,
  parseStringArguments,
} from '../_platform/cli/workflow-route-inputs'

type RoutedWorkflow = ConstructorParameters<typeof RecordIssue>[0]
type RoutedWorkflowState = ReturnType<RoutedWorkflow['getState']>

/** @riviere-role cli-entrypoint */
export function createWorkflowRoutes(
  stateNameSchema: ZodType<RoutedWorkflowState['currentStateMachineState']>,
) {
  return defineRoutes<RoutedWorkflow, RoutedWorkflowState>({
    init: { type: 'session-start' },
    transition: {
      type: 'transition',
      args: [arg.state('STATE', stateNameSchema)],
    },
    'record-issue': {
      type: 'transaction',
      args: [arg.number('number')],
      handler: (workflow, issueNumber) =>
        new RecordIssue(workflow).execute({ issueNumber: parseNumberArgument(issueNumber) }),
    },
    'record-branch': {
      type: 'transaction',
      args: [arg.string('branch')],
      handler: (workflow, branch) =>
        new RecordBranch(workflow).execute({ branch: parseStringArgument(branch) }),
    },
    'record-pr': {
      type: 'transaction',
      args: [arg.number('number'), arg.string('url').optional()],
      handler: (workflow, number, url) =>
        new RecordPullRequest(workflow).execute({
          number: parseNumberArgument(number),
          url: parseOptionalStringArgument(url),
        }),
    },
    'create-pr': {
      type: 'transaction',
      args: [arg.rest()],
      handler: (workflow, args) =>
        new CreatePullRequest(workflow).execute({ arguments: parseStringArguments(args) }),
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
        new RecordCiFailed(workflow).execute({ output: parseStringArgument(output) }),
    },
    'verify-feedback-addressed': {
      type: 'transaction',
      args: [],
      handler: (workflow) => new VerifyFeedbackAddressed(workflow).execute({}),
    },
  })
}
