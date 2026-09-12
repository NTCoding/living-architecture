import type { MaintainerWorkflow as Workflow } from '@living-architecture/dev-workflow-v2-domain-model/domain/workflow'
import type { Reviewer } from '@living-architecture/dev-workflow-v2-domain-model/domain/reviews/reviewers'
import type { CreatePullRequestInput } from './create-pull-request-input'
import type { CreatePullRequestFailure } from './create-pull-request-result'

type WorkflowResult = ReturnType<Workflow['executeRecording']>
type ReviewerStatus = Parameters<Workflow['recordReviewerStatus']>[1]

/** @riviere-role command-use-case-input */
export interface CreateWorkflowRoutesInput {
  readonly parseNumberArgument: (value: unknown) => number
  readonly parseStringArgument: (value: unknown) => string
  readonly parseStringArguments: (value: unknown) => readonly string[]
  readonly recordIssue: (workflow: Workflow, issueNumber: number) => WorkflowResult
  readonly recordBranch: (workflow: Workflow, branch: string) => WorkflowResult
  readonly recordReviewerStatus: (
    workflow: Workflow,
    reviewer: Reviewer,
    status: ReviewerStatus,
  ) => WorkflowResult
  readonly parsePullRequestDescriptionOptions: (
    args: readonly string[],
  ) =>
    | { readonly ok: true; readonly input: CreatePullRequestInput }
    | { readonly ok: false; readonly reason: string }
  readonly formatPullRequestDetailsFailure: (failure: CreatePullRequestFailure) => string
}
