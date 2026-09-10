import { arg } from '@nt-ai-lab/deterministic-agent-workflow-cli'
import type { defineRoutes, RouteMap } from '@nt-ai-lab/deterministic-agent-workflow-cli'
import type { MaintainerWorkflow as Workflow } from '@living-architecture/dev-workflow-v2-domain-model/domain/workflow'
import { Reviewer } from '@living-architecture/dev-workflow-v2-domain-model/domain/reviews/reviewers'
import { ReviewStatuses } from '@living-architecture/dev-workflow-v2-domain-model/domain/reviews/statuses'
import type { PullRequestDescriptionInput } from '@living-architecture/dev-workflow-v2-domain-model/domain/pull-request-description'
import type { ZodType } from 'zod'

export type { PullRequestDescriptionInput }

interface ZodSchemaProvider<T> {
  getSchema(): ZodType<T>
}

type DefineWorkflowRoutes = typeof defineRoutes

type RoutedWorkflow = Workflow
type RoutedWorkflowState = ReturnType<RoutedWorkflow['getState']>

type WorkflowResult = ReturnType<Workflow['executeRecording']>
type ReviewerStatus = Parameters<Workflow['recordReviewerStatus']>[1]

class InvalidReviewerStatusError extends Error {}

function parseReviewerStatus(value: string): ReviewerStatus {
  try {
    return ReviewStatuses.schema().parse(value)
  } catch {
    throw new InvalidReviewerStatusError(`Unknown reviewer status: ${value}`)
  }
}

/** @riviere-role command-use-case-input */
export interface CreateWorkflowRoutesInput {
  readonly parseNumberArgument: (value: unknown) => number
  readonly parseStringArgument: (value: unknown) => string
  readonly parseStringArguments: (value: unknown) => readonly string[]
  readonly recordIssue: (workflow: RoutedWorkflow, issueNumber: number) => WorkflowResult
  readonly recordBranch: (workflow: RoutedWorkflow, branch: string) => WorkflowResult
  readonly recordReviewerStatus: (
    workflow: RoutedWorkflow,
    reviewer: Reviewer,
    status: ReviewerStatus,
  ) => WorkflowResult
  readonly createPullRequest: (workflow: RoutedWorkflow, args: readonly string[]) => WorkflowResult
}

interface WorkflowRouteDefinitions extends RouteMap<RoutedWorkflow, RoutedWorkflowState> {
  readonly init: { readonly type: 'session-start' }
  readonly transition: {
    readonly type: 'transition'
    readonly args: readonly [ReturnType<typeof arg.state>]
  }
  readonly 'record-issue': {
    readonly type: 'transaction'
    readonly args: readonly [ReturnType<typeof arg.number>]
    readonly handler: (workflow: RoutedWorkflow, issueNumber: unknown) => WorkflowResult
  }
  readonly 'record-branch': {
    readonly type: 'transaction'
    readonly args: readonly [ReturnType<typeof arg.string>]
    readonly handler: (workflow: RoutedWorkflow, branch: unknown) => WorkflowResult
  }
  readonly 'create-pr': {
    readonly type: 'transaction'
    readonly args: readonly [ReturnType<typeof arg.rest>]
    readonly handler: (workflow: RoutedWorkflow, args: unknown) => WorkflowResult
  }
  readonly 'record-reviewer-status': {
    readonly type: 'transaction'
    readonly args: readonly [ReturnType<typeof arg.string>, ReturnType<typeof arg.string>]
    readonly handler: (
      workflow: RoutedWorkflow,
      reviewer: unknown,
      status: unknown,
    ) => WorkflowResult
  }
}

/** @riviere-role command-use-case-result */
export interface CreateWorkflowRoutesResult {
  readonly routes: WorkflowRouteDefinitions
}

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
        handler: (workflow: RoutedWorkflow, args: unknown) =>
          input.createPullRequest(workflow, input.parseStringArguments(args)),
      },
      'record-reviewer-status': {
        type: 'transaction' as const,
        args: [arg.string('reviewer'), arg.string('status')] as const,
        handler: (workflow: RoutedWorkflow, reviewer: unknown, status: unknown) =>
          input.recordReviewerStatus(
            workflow,
            Reviewer.fromName(input.parseStringArgument(reviewer)),
            parseReviewerStatus(input.parseStringArgument(status)),
          ),
      },
    }
    this.defineRoutes<RoutedWorkflow, RoutedWorkflowState>(routes)
    return {
      routes,
    }
  }
}
