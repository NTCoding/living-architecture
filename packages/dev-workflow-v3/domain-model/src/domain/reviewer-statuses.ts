import { Reviewer } from './reviewer'
import { ReviewerStatus } from './reviewer-status'

type ReviewerStatusEntry = readonly [Reviewer, ReviewerStatus]

/** @riviere-role value-object */
export class ReviewerStatuses {
  declare private readonly brand: 'ReviewerStatuses'

  private constructor(private readonly entries: readonly ReviewerStatusEntry[]) {}

  static parse(record: Readonly<Record<string, string>>): ReviewerStatuses {
    return new ReviewerStatuses(
      Object.entries(record).map(([reviewerName, statusName]) => {
        const reviewer = Reviewer.fromName(reviewerName)
        const status = ReviewerStatus.parse(statusName)
        return [reviewer, status] as const
      }),
    )
  }

  static fromInitialState(
    reviewers: readonly Reviewer[],
    status: ReviewerStatus,
  ): ReviewerStatuses {
    return new ReviewerStatuses(reviewers.map((reviewer) => [reviewer, status] as const))
  }

  statusFor(reviewer: Reviewer): ReviewerStatus | undefined {
    return this.entries.find(([entry]) => entry.equals(reviewer))?.[1]
  }

  withReviewer(reviewer: Reviewer, status: ReviewerStatus): ReviewerStatuses {
    const known = this.entries.some(([entry]) => entry.equals(reviewer))
    return new ReviewerStatuses(
      known
        ? this.entries.map(([entry, entryStatus]) =>
            entry.equals(reviewer) ? ([entry, status] as const) : ([entry, entryStatus] as const),
          )
        : [...this.entries, [reviewer, status] as const],
    )
  }

  toJSON(): Readonly<Record<string, string>> {
    return Object.fromEntries(
      this.entries.map(([reviewer, status]) => [reviewer.name(), status.name()]),
    )
  }
}
