import type { WorkflowState } from '../workflow-types'

/**
 * @riviere-role domain-port
 * @riviere-role-justification MaintainerWorkflow reads current pull request feedback through this capability when evaluating workflow behaviour. The feedback is not previously created MaintainerWorkflow state.
 */
export type ReadWorkflowPullRequestFeedback = (
  prNumber: number,
  options: { readonly includeCodeRabbitStatus: boolean },
) => {
  readonly repository?: string
  readonly headRevision?: string
  readonly codeRabbitReview?:
    | { readonly type: 'pending' | 'not-requested' }
    | { readonly type: 'unsupported'; readonly reason: string }
    | {
        readonly type: 'completed' | 'failed' | 'rate-limited'
        readonly statusId: number
        readonly evidenceUrl: string
      }
  readonly reviewDecision: string | null
  readonly coderabbitReviewSeen: boolean
  readonly coderabbitRateLimited?: boolean
  readonly coderabbitRateLimitEvidence?: NonNullable<WorkflowState['coderabbitRateLimitEvidence']>
  readonly unresolvedCount: number
  readonly threads: readonly {
    readonly id: string
    readonly isResolved: boolean
    readonly isOutdated: boolean
    readonly path: string | null
    readonly line: number | null
    readonly comments: readonly {
      readonly author: { readonly login: string } | null
      readonly body: string
      readonly url?: string
    }[]
  }[]
}
