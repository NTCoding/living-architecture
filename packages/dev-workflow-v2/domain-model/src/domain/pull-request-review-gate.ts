import { z } from 'zod'
import { WorkflowState } from './workflow-types'
import { ReviewerSatisfaction } from './reviewer-satisfaction'
import { PullRequestChecks } from './pull-request-checks'

const codeRabbitReviewSchema = z.union([
  z.object({ type: z.enum(['pending', 'not-requested']) }),
  z.object({ type: z.literal('unsupported'), reason: z.string() }),
  z.object({
    type: z.enum(['completed', 'failed', 'rate-limited']),
    statusId: z.number().int().positive(),
    evidenceUrl: z.string().url(),
  }),
])
const gateSchema = z.object({
  snapshot: WorkflowState.pullRequestSnapshotSchema(),
  reviewers: ReviewerSatisfaction.snapshotSchema(),
  checks: PullRequestChecks.snapshotSchema(),
  skippedCodeRabbit: WorkflowState.codeRabbitRateLimitEvidenceSchema().optional(),
  feedback: z.object({
    repository: z.string().optional(),
    headRevision: z.string().optional(),
    reviewDecision: z.enum(['APPROVED', 'CHANGES_REQUESTED', 'REVIEW_REQUIRED']).nullable(),
    unresolvedCount: z.number().int().nonnegative(),
    codeRabbitReview: codeRabbitReviewSchema.optional(),
  }),
})
type CodeRabbitDecision =
  | { readonly status: 'available'; readonly outcome: 'completed' | 'SKIPPED_RATE_LIMIT' }
  | { readonly status: 'pending' }
  | { readonly status: 'blocked'; readonly reason: string }
type ReviewGateDecision =
  | { readonly status: 'blocked' | 'reviewing' | 'addressing-feedback'; readonly reason: string }
  | { readonly status: 'reflecting'; readonly codeRabbit: 'completed' | 'SKIPPED_RATE_LIMIT' }

/** @riviere-role value-object */
export class PullRequestReviewGate {
  declare private readonly brand: 'PullRequestReviewGate'

  private constructor(private readonly value: z.infer<typeof gateSchema>) {}

  static parse(value: unknown): PullRequestReviewGate {
    return new PullRequestReviewGate(gateSchema.parse(value))
  }

  assess(): ReviewGateDecision {
    const { snapshot, feedback, reviewers } = this.value
    if (
      feedback.repository !== snapshot.repository ||
      feedback.headRevision !== snapshot.headRevision
    )
      return {
        status: 'blocked',
        reason: 'Feedback does not belong to the recorded repository and current PR head.',
      }
    const checks = PullRequestChecks.parse(this.value.checks).assessFor(snapshot.headRevision)
    if (checks.status === 'blocked') return checks
    const codeRabbit = this.assessCodeRabbit()
    if (codeRabbit.status === 'blocked') return codeRabbit
    if (checks.status === 'failed')
      return {
        status: 'addressing-feedback',
        reason: `Required checks failed: ${JSON.stringify(checks.checks)}`,
      }
    if (feedback.unresolvedCount > 0 || feedback.reviewDecision === 'CHANGES_REQUESTED')
      return {
        status: 'addressing-feedback',
        reason: `Unresolved PR review threads: ${String(feedback.unresolvedCount)}. Review decision: ${String(feedback.reviewDecision)}.`,
      }
    if (checks.status === 'pending')
      return { status: 'reviewing', reason: 'Waiting for required checks on the current head.' }
    if (!ReviewerSatisfaction.parse(reviewers).allSatisfied())
      return { status: 'reviewing', reason: 'Waiting for all four reviewers to be satisfied.' }
    if (codeRabbit.status === 'pending')
      return {
        status: 'reviewing',
        reason: 'Waiting for verified CodeRabbit completion on the current head.',
      }
    return { status: 'reflecting', codeRabbit: codeRabbit.outcome }
  }

  private assessCodeRabbit(): CodeRabbitDecision {
    const { skippedCodeRabbit, snapshot, feedback } = this.value
    if (skippedCodeRabbit !== undefined) {
      if (
        skippedCodeRabbit.repository !== snapshot.repository ||
        skippedCodeRabbit.prNumber !== snapshot.prNumber
      )
        return {
          status: 'blocked',
          reason: 'CodeRabbit rate-limit evidence does not belong to the recorded PR.',
        }
      return { status: 'available', outcome: 'SKIPPED_RATE_LIMIT' }
    }
    const review = feedback.codeRabbitReview
    if (review === undefined)
      return { status: 'blocked', reason: 'CodeRabbit completion evidence is missing.' }
    switch (review.type) {
      case 'pending':
        return { status: 'pending' }
      case 'not-requested':
        return {
          status: 'blocked',
          reason: 'CodeRabbit was not checked and no rate-limit skip is recorded.',
        }
      case 'unsupported':
        return { status: 'blocked', reason: review.reason }
      case 'failed':
        return { status: 'blocked', reason: `CodeRabbit reported failure: ${review.evidenceUrl}` }
      case 'completed':
        return { status: 'available', outcome: 'completed' }
      case 'rate-limited':
        return {
          status: 'blocked',
          reason:
            'Persist the verified PR-wide CodeRabbit rate-limit evidence before assessing the gate.',
        }
    }
  }
}
