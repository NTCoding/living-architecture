import type { PreconditionResult } from '@nt-ai-lab/deterministic-agent-workflow-dsl'
import { z } from 'zod'
import type { WorkflowTransitionContext } from '../workflow-transition-context'
import type { WorkflowState } from '../workflow-types'
import type { WorkflowEvent } from '../workflow-events'
import type { CreateWorkflowPullRequest } from '../ports/create-pull-request'
import { WorkflowStateError } from '@nt-ai-lab/deterministic-agent-workflow-engine'

type SubmittingPrEntryContext = {
  readonly workflow: { getState(): WorkflowState; appendEvent(event: WorkflowEvent): void }
  readonly deps: {
    readonly createPullRequest: CreateWorkflowPullRequest
    readonly now: () => string
    readonly emitEvent: (event: WorkflowEvent, state: WorkflowState) => void
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

  private readonly entryContext: SubmittingPrEntryContext | undefined

  private constructor(name: 'SUBMITTING_PR', entryContext?: SubmittingPrEntryContext) {
    this.name = name
    this.entryContext = entryContext
  }

  static parse(value: unknown): SubmittingPrState {
    z.literal('SUBMITTING_PR').parse(value)
    return new SubmittingPrState('SUBMITTING_PR')
  }

  withEntryContext(entryContext: SubmittingPrEntryContext): SubmittingPrState {
    return new SubmittingPrState(this.name, entryContext)
  }

  transitionGuard(
    context: Parameters<typeof WorkflowTransitionContext.from>[0],
  ): PreconditionResult {
    if (!context.state.prNumber) {
      return {
        pass: false,
        reason: 'Pull request creation did not record a pull request.',
      }
    }
    return { pass: true }
  }

  afterEntry(): void {
    if (this.entryContext === undefined)
      throw new WorkflowStateError('Submitting PR entry dependencies have not been configured.')
    const context = this.entryContext
    const state = context.workflow.getState()
    if (state.githubIssue === undefined) {
      throw new WorkflowStateError(
        'githubIssue not set. Record the issue before submitting the pull request.',
      )
    }
    if (state.featureBranch === undefined) {
      throw new WorkflowStateError(
        'featureBranch not set. Record the branch before submitting the pull request.',
      )
    }

    const pullRequest = context.deps.createPullRequest({
      branch: state.featureBranch,
      title: `Implement #${String(state.githubIssue)}`,
      body: `Closes #${String(state.githubIssue)}`,
    })
    if (pullRequest.isDraft) {
      throw new WorkflowStateError(
        `Expected workflow-created PR #${String(pullRequest.prNumber)} to be ready for review.`,
      )
    }
    context.deps.emitEvent(
      {
        type: 'pr-recorded',
        at: context.deps.now(),
        prNumber: pullRequest.prNumber,
        prUrl: pullRequest.prUrl,
      },
      state,
    )
  }
}
