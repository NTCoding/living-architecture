import type { PreconditionResult } from '@nt-ai-lab/deterministic-agent-workflow-dsl'
import { z } from 'zod'
import type { WorkflowTransitionContext } from '../workflow-transition-context'
import type { WorkflowState } from '../workflow-types'
import type { CreateWorkflowPullRequest } from '../ports/create-pull-request'
import { WorkflowStateError } from '@nt-ai-lab/deterministic-agent-workflow-engine'

/** @riviere-role domain-port
 * @riviere-role-justification State entry receives external capabilities and aggregate operations; it does not load previously created workflow state.
 */
export type SubmittingPrDependencies = {
  readonly workflow: {
    getState(): WorkflowState
    getSubmissionDetails(): { readonly githubIssue: number; readonly featureBranch: string }
    recordPullRequest(prNumber: number, prUrl: string): { readonly pass: boolean; readonly reason?: string }
  }
  readonly deps: {
    readonly createPullRequest: CreateWorkflowPullRequest
    readonly now: () => string
  }
}

/** @riviere-role value-object */
export class SubmittingPrState {
  declare private readonly brand: 'SubmittingPrState'

  readonly name: 'SUBMITTING_PR'
  readonly emoji = '🚀'
  readonly agentInstructions = 'states/submitting_pr.md'
  readonly canTransitionTo = ['REVIEWING', 'BLOCKED'] as const
  readonly allowedWorkflowOperations = [] as const
  readonly forbidden = { write: true } as const

  private readonly dependencies: SubmittingPrDependencies | undefined

  private constructor(name: 'SUBMITTING_PR', dependencies?: SubmittingPrDependencies) {
    this.name = name
    this.dependencies = dependencies
  }

  static parse(value: unknown, dependencies?: SubmittingPrDependencies): SubmittingPrState {
    z.literal('SUBMITTING_PR').parse(value)
    return new SubmittingPrState('SUBMITTING_PR', dependencies)
  }

  transitionGuard(
    context: Parameters<typeof WorkflowTransitionContext.from>[0],
  ): PreconditionResult {
    if (context.to === 'REVIEWING' && context.state.prNumber === undefined) {
      return {
        pass: false,
        reason: 'Pull request creation did not record a pull request.',
      }
    }
    return { pass: true }
  }

  afterEntry(): void {
    if (this.dependencies === undefined)
      throw new WorkflowStateError('Submitting PR entry dependencies have not been configured.')
    const context = this.dependencies
    const { githubIssue, featureBranch } = context.workflow.getSubmissionDetails()

    const pullRequest = context.deps.createPullRequest({
      branch: featureBranch,
      title: `Implement #${String(githubIssue)}`,
      body: `Closes #${String(githubIssue)}`,
      draft: false,
    })
    context.workflow.recordPullRequest(pullRequest.prNumber, pullRequest.prUrl)
  }
}
