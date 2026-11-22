import type { ReviewFinding } from './review-finding'
import type { ReviewVerdict } from './review-verdict'

/** @riviere-role value-object */
export class AggregatedReviewResults {
  declare private readonly brand: 'AggregatedReviewResults'

  private constructor(private readonly verdicts: readonly ReviewVerdict[]) {}

  static from(verdicts: readonly ReviewVerdict[]): AggregatedReviewResults {
    return new AggregatedReviewResults(verdicts)
  }

  hasOpenFeedback(): boolean {
    return this.verdicts.some((verdict) => verdict.status().isOpenFeedback())
  }

  isApproved(): boolean {
    return !this.hasOpenFeedback()
  }

  findings(): readonly ReviewFinding[] {
    return this.verdicts.flatMap((verdict) => [...verdict.findings()])
  }
}
