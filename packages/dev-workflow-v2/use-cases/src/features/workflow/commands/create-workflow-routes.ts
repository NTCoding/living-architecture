import { arg } from '@nt-ai-lab/deterministic-agent-workflow-cli'
import type { defineRoutes, RouteMap } from '@nt-ai-lab/deterministic-agent-workflow-cli'
import type { MaintainerWorkflow as Workflow } from '@living-architecture/dev-workflow-v2-domain-model/domain/workflow'
import {
  CommitType,
  PullRequestCreationDetails,
  PullRequestDescription,
  PullRequestTitle,
} from '@living-architecture/dev-workflow-v2-domain-model/domain/pull-request-description'
import { Reviewer } from '@living-architecture/dev-workflow-v2-domain-model/domain/reviews/reviewers'
import { ReviewStatuses } from '@living-architecture/dev-workflow-v2-domain-model/domain/reviews/statuses'
import type { ZodType } from 'zod'

interface ZodSchemaProvider<T> {
  getSchema(): ZodType<T>
}

type DefineWorkflowRoutes = typeof defineRoutes

type RoutedWorkflow = Workflow
type RoutedWorkflowState = ReturnType<RoutedWorkflow['getState']>

type WorkflowResult = ReturnType<Workflow['executeRecording']>
type ReviewerStatus = Parameters<Workflow['recordReviewerStatus']>[1]

/** @riviere-role command-use-case-input */
export interface CreatePullRequestInput {
  readonly commitType: string
  readonly commitScope: string
  readonly title: string
  readonly description: string
  readonly problem: string
  readonly acceptanceCriteria: string
  readonly keyChanges: string
  readonly architectureImpact: string
  readonly validation: string
  readonly notes: string
}

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
  readonly parsePullRequestDescriptionOptions: (
    args: readonly string[],
  ) =>
    | { readonly ok: true; readonly input: CreatePullRequestInput }
    | { readonly ok: false; readonly reason: string }
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

function createPullRequestDetails(
  input: CreatePullRequestInput,
):
  | { readonly ok: true; readonly value: PullRequestCreationDetails }
  | { readonly ok: false; readonly reason: string } {
  const commitType = CommitType.from(input.commitType)
  if (!commitType.ok) return commitType
  const title = PullRequestTitle.from(input.title)
  if (!title.ok) return title
  const description = PullRequestDescription.from(input.description)
  if (!description.ok) return description
  if (`${commitType.value.name()}(${input.commitScope}): ${input.title}`.length > 100) {
    return {
      ok: false,
      reason: 'Expected composed pull request title to be at most 100 characters.',
    }
  }
  return {
    ok: true,
    value: PullRequestCreationDetails.from({
      commitType: commitType.value,
      commitScope: input.commitScope,
      title: title.value,
      description: description.value,
      problem: input.problem,
      acceptanceCriteria: input.acceptanceCriteria,
      keyChanges: input.keyChanges,
      architectureImpact: input.architectureImpact,
      validation: input.validation,
      notes: input.notes,
    }),
  }
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
        handler: (workflow: RoutedWorkflow, args: unknown) => {
          const parsed = input.parsePullRequestDescriptionOptions(input.parseStringArguments(args))
          if (!parsed.ok) return { pass: false, reason: parsed.reason }
          const details = createPullRequestDetails(parsed.input)
          if (!details.ok) return { pass: false, reason: details.reason }
          return workflow.createPr(details.value)
        },
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
