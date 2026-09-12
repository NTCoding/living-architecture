import { arg } from '@nt-ai-lab/deterministic-agent-workflow-cli'
import type { defineRoutes } from '@nt-ai-lab/deterministic-agent-workflow-cli'
import type { MaintainerWorkflow as Workflow } from '@living-architecture/dev-workflow-v2-domain-model/domain/workflow'
import { Reviewer } from '@living-architecture/dev-workflow-v2-domain-model/domain/reviews/reviewers'
import { ReviewerStatus } from '@living-architecture/dev-workflow-v2-domain-model/domain/reviews/statuses'
import type { ZodType } from 'zod'
import type { CreateWorkflowRoutesInput } from './create-workflow-routes-input'
import type { CreateWorkflowRoutesResult } from './create-workflow-routes-result'
import { PullRequestCreationDetails } from '@living-architecture/dev-workflow-v2-domain-model/domain/pull-request-description'
interface ZodSchemaProvider<T> {
  getSchema(): ZodType<T>
}
type DefineWorkflowRoutes = typeof defineRoutes
type RoutedWorkflow = Workflow

/** @riviere-role command-use-case */
export class CreateWorkflowRoutes {
  constructor(
    private readonly stateNameSchemaProvider: ZodSchemaProvider<string>,
    private readonly defineRoutes: DefineWorkflowRoutes,
  ) {}

  execute(input: CreateWorkflowRoutesInput): CreateWorkflowRoutesResult {
    const stateNameSchema = this.stateNameSchemaProvider.getSchema()
    const routes = {
      init: { type: 'session-start' as const },
      transition: {
        type: 'transition' as const,
        args: [arg.state('STATE', stateNameSchema)] as const,
      },
      'record-issue': {
        type: 'transaction' as const,
        args: [arg.number('number')] as const,
        handler: (workflow: RoutedWorkflow, issueNumber: unknown) =>
          input.recordIssue(workflow, input.parseNumberArgument(issueNumber)),
      },
      'record-branch': {
        type: 'transaction' as const,
        args: [arg.string('branch')] as const,
        handler: (workflow: RoutedWorkflow, branch: unknown) =>
          input.recordBranch(workflow, input.parseStringArgument(branch)),
      },
      'create-pr': {
        type: 'transaction' as const,
        args: [arg.rest()] as const,
        handler: (workflow: RoutedWorkflow, args: unknown) => {
          const parsed = input.parsePullRequestDescriptionOptions(input.parseStringArguments(args))
          if (!parsed.ok) return { pass: false, reason: parsed.reason }
          const details = PullRequestCreationDetails.from(parsed.input)
          if (!details.ok)
            return { pass: false, reason: input.formatPullRequestDetailsFailure(details) }
          return workflow.createPr(details.value)
        },
      },
      'record-reviewer-status': {
        type: 'transaction' as const,
        args: [arg.string('reviewer'), arg.string('status')] as const,
        handler: (workflow: RoutedWorkflow, reviewer: unknown, status: unknown) => {
          const parsedStatus = ReviewerStatus.fromName(input.parseStringArgument(status))
          if (!parsedStatus.ok) return { pass: false, reason: parsedStatus.reason }
          return input.recordReviewerStatus(
            workflow,
            Reviewer.fromName(input.parseStringArgument(reviewer)),
            parsedStatus.value.name(),
          )
        },
      },
    }
    this.defineRoutes<RoutedWorkflow, ReturnType<RoutedWorkflow['getState']>>(routes)
    return {
      routes,
    }
  }
}
