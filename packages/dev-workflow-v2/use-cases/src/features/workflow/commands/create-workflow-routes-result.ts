import type { arg, RouteMap } from '@nt-ai-lab/deterministic-agent-workflow-cli'
import type { MaintainerWorkflow as Workflow } from '@living-architecture/dev-workflow-v2-domain-model/domain/workflow'

type WorkflowResult = ReturnType<Workflow['executeRecording']>

interface WorkflowRouteDefinitions extends RouteMap<Workflow, ReturnType<Workflow['getState']>> {
  readonly init: { readonly type: 'session-start' }
  readonly transition: {
    readonly type: 'transition'
    readonly args: readonly [ReturnType<typeof arg.state>]
  }
  readonly 'record-issue': {
    readonly type: 'transaction'
    readonly args: readonly [ReturnType<typeof arg.number>]
    readonly handler: (workflow: Workflow, issueNumber: unknown) => WorkflowResult
  }
  readonly 'record-branch': {
    readonly type: 'transaction'
    readonly args: readonly [ReturnType<typeof arg.string>]
    readonly handler: (workflow: Workflow, branch: unknown) => WorkflowResult
  }
  readonly 'create-pr': {
    readonly type: 'transaction'
    readonly args: readonly [ReturnType<typeof arg.rest>]
    readonly handler: (workflow: Workflow, args: unknown) => WorkflowResult
  }
  readonly 'record-reviewer-status': {
    readonly type: 'transaction'
    readonly args: readonly [ReturnType<typeof arg.string>, ReturnType<typeof arg.string>]
    readonly handler: (workflow: Workflow, reviewer: unknown, status: unknown) => WorkflowResult
  }
  readonly 'wait-for-coderabbit-and-close-review-cycle': {
    readonly type: 'transaction'
    readonly args: readonly []
    readonly handler: (workflow: Workflow) => WorkflowResult
  }
}

/** @riviere-role command-use-case-result */
export interface CreateWorkflowRoutesResult {
  readonly routes: WorkflowRouteDefinitions
}
