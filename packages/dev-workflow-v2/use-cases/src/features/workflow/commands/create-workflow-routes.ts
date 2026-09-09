import { arg } from '@nt-ai-lab/deterministic-agent-workflow-cli'
import type { defineRoutes, RouteMap } from '@nt-ai-lab/deterministic-agent-workflow-cli'
import type { MaintainerWorkflow as Workflow } from '@living-architecture/dev-workflow-v2-domain-model/domain/workflow'
import type { ZodType } from 'zod'

interface ZodSchemaProvider<T> {
  getSchema(): ZodType<T>
}

type DefineWorkflowRoutes = typeof defineRoutes

type RoutedWorkflow = Workflow
type RoutedWorkflowState = ReturnType<RoutedWorkflow['getState']>

type WorkflowResult = ReturnType<Workflow['executeRecording']>
type Reviewer = Parameters<Workflow['recordReviewerStatus']>[0]
type ReviewerStatus = Parameters<Workflow['recordReviewerStatus']>[1]
const REVIEWER_KEYS = [
  'architecture-review',
  'code-review',
  'bug-scanner',
  'task-check',
  'coderabbit',
] as const

class InvalidReviewerStatusError extends Error {}

function parseReviewer(value: string): Reviewer {
  for (const reviewer of REVIEWER_KEYS) if (reviewer === value) return reviewer
  throw new InvalidReviewerStatusError(`Unknown reviewer: ${value}`)
}

function parseReviewerStatus(value: string): ReviewerStatus {
  if (value === 'PENDING' || value === 'OPEN_FEEDBACK' || value === 'APPROVED') return value
  throw new InvalidReviewerStatusError(`Unknown reviewer status: ${value}`)
}

/** @riviere-role command-use-case-input */
export interface CreateWorkflowRoutesInput {
  readonly parseNumberArgument: (value: unknown) => number
  readonly parseStringArgument: (value: unknown) => string
  readonly recordIssue: (workflow: RoutedWorkflow, issueNumber: number) => WorkflowResult
  readonly recordBranch: (workflow: RoutedWorkflow, branch: string) => WorkflowResult
  readonly recordReviewerStatus: (
    workflow: RoutedWorkflow,
    reviewer: Reviewer,
    status: ReviewerStatus,
  ) => WorkflowResult
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
      'record-reviewer-status': {
        type: 'transaction' as const,
        args: [arg.string('reviewer'), arg.string('status')] as const,
        handler: (workflow: RoutedWorkflow, reviewer: unknown, status: unknown) =>
          input.recordReviewerStatus(
            workflow,
            parseReviewer(input.parseStringArgument(reviewer)),
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
