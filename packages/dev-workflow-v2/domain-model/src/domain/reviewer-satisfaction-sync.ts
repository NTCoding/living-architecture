import type { StoredReview } from '@nt-ai-lab/deterministic-agent-workflow-engine'
import { ReviewerSatisfaction } from './reviewer-satisfaction'
import type { WorkflowState } from './workflow-types'

type ReviewerCompletion = {
  readonly reviewType: 'architecture-review' | 'code-review' | 'bug-scanner' | 'task-check'
  readonly verdict: 'PASS' | 'FAIL'
  readonly reviewId: number
  readonly headRevision: string
}

type SyncResult =
  | {
      readonly ok: true
      readonly completions: readonly ReviewerCompletion[]
    }
  | {
      readonly ok: false
      readonly reason: string
    }

/**
 * @riviere-role domain-service
 * @riviere-role-justification Computes reviewer-satisfaction completions from stored platform reviews so the workflow can persist them without coupling to the event store.
 */
export function computeReviewerSatisfactionSync(
  reviews: readonly StoredReview[],
  snapshot: NonNullable<WorkflowState['pullRequestSnapshot']>,
  current: ReturnType<ReviewerSatisfaction['toJSON']>,
): SyncResult {
  const satisfaction = ReviewerSatisfaction.parse(current)
  const completions = reviews.flatMap((review) => {
    if (review.pullRequestNumber !== snapshot.prNumber) return []
    if (review.completionProvenance?.headRevision !== snapshot.headRevision) return []
    const parsedReviewType = ReviewerSatisfaction.reviewerNameSchema().safeParse(review.reviewType)
    if (!parsedReviewType.success) return []
    if (!satisfaction.reviewersNeedingReview().includes(parsedReviewType.data)) return []
    return [
      {
        reviewType: parsedReviewType.data,
        verdict: review.verdict,
        reviewId: review.id,
        headRevision: snapshot.headRevision,
      },
    ]
  })
  if (completions.length === 0) {
    return {
      ok: false,
      reason: 'No new reviewer completions to sync from the event store.',
    }
  }
  return {
    ok: true,
    completions,
  }
}
