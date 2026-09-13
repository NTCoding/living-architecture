import { Reviewer } from './reviewers'
import { ReviewerStatus } from './statuses'

/** @riviere-role value-object */
export class ReviewOutcome {
  declare private readonly brand: 'ReviewOutcome'

  private constructor(
    private readonly outcomeReviewer: Reviewer,
    private readonly outcomeStatus: ReviewerStatus,
  ) {}

  static from(reviewer: Reviewer, status: ReviewerStatus): ReviewOutcome {
    return new ReviewOutcome(reviewer, status)
  }

  reviewer(): Reviewer {
    return this.outcomeReviewer
  }

  status(): ReviewerStatus {
    return this.outcomeStatus
  }
}

/** @riviere-role value-object */
export class AggregatedReviewResults {
  declare private readonly brand: 'AggregatedReviewResults'

  private constructor(private readonly results: readonly ReviewOutcome[]) {}

  static from(results: readonly ReviewOutcome[]): AggregatedReviewResults {
    return new AggregatedReviewResults(results)
  }

  hasOpenFeedback(): boolean {
    return this.results.some((outcome) => outcome.status().isOpenFeedback())
  }

  isPending(): boolean {
    return this.results.some((outcome) => outcome.status().isPending())
  }

  isApproved(): boolean {
    return !this.hasOpenFeedback() && !this.isPending()
  }
}
