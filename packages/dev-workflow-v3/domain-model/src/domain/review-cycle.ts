import { ReviewCycleLimit } from './review-cycle-limit'
import { ReviewCyclePlan } from './review-cycle-plan'
import type { Reviewer } from './reviewer'
import { Reviewers } from './reviewer'
import type { ReviewerStatus } from './reviewer-status'
import { ReviewerStatuses } from './reviewer-statuses'
import type { ReviewVerdict } from './review-verdict'

/** @riviere-role domain-error */
export class InvalidReviewCycle extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidReviewCycle'
  }
}

type ReviewCycleStart = {
  readonly cycleNumber: number
  readonly statuses: ReviewerStatuses
  readonly limit?: ReviewCycleLimit
}

/**
 * @riviere-role aggregate
 */
export class ReviewCycle {
  private constructor(
    private readonly number: number,
    private readonly reviewerStatuses: ReviewerStatuses,
    private readonly reviewCycleLimit: ReviewCycleLimit,
  ) {}

  static start(input: ReviewCycleStart): ReviewCycle {
    if (!Number.isInteger(input.cycleNumber) || input.cycleNumber < 1) {
      throw new InvalidReviewCycle(`A cycle number is a positive integer: ${input.cycleNumber}`)
    }
    return new ReviewCycle(
      input.cycleNumber,
      input.statuses,
      input.limit ?? ReviewCycleLimit.singleton(),
    )
  }

  reviewersToRun(): ReviewCyclePlan {
    const all = Reviewers.singleton().all()
    const approved = all.filter(
      (reviewer) => this.reviewerStatuses.statusFor(reviewer)?.isApproved() === true,
    )
    return ReviewCyclePlan.from(
      all.filter((reviewer) => !approved.some((appr) => appr.equals(reviewer))),
      approved,
    )
  }

  recordVerdict(verdict: ReviewVerdict): ReviewCycle {
    const reviewer = verdict.reviewer()
    const status = this.reviewerStatuses.statusFor(reviewer)
    if (status?.isApproved() === true) {
      throw new InvalidReviewCycle(
        `The reviewer ${reviewer.name()} already approved and is left out of later cycles.`,
      )
    }
    return new ReviewCycle(
      this.number,
      this.reviewerStatuses.withReviewer(reviewer, verdict.status()),
      this.reviewCycleLimit,
    )
  }

  beginNextCycle(): ReviewCycle {
    return new ReviewCycle(this.number + 1, this.reviewerStatuses, this.reviewCycleLimit)
  }

  cycleNumber(): number {
    return this.number
  }

  statusFor(reviewer: Reviewer): ReviewerStatus | undefined {
    return this.reviewerStatuses.statusFor(reviewer)
  }

  statuses(): ReviewerStatuses {
    return this.reviewerStatuses
  }

  isLimitReached(): boolean {
    return this.reviewCycleLimit.isReached(this.number)
  }
}
