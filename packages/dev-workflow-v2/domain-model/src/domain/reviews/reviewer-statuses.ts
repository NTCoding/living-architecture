import { Reviewer } from './reviewers'
import { InvalidReviewerStatus, ReviewerStatus } from './statuses'

type ReviewerStatusEntry = readonly [Reviewer, ReviewerStatus]

/** @riviere-role value-object */
export class ReviewerStatuses {
  declare private readonly brand: 'ReviewerStatuses'

  private constructor(private readonly entries: readonly ReviewerStatusEntry[]) {}

  static parse(record: Readonly<Record<string, string>>): ReviewerStatuses {
    return new ReviewerStatuses(
      Object.entries(record).map(([reviewerName, statusName]) => {
        const status = ReviewerStatus.fromName(statusName)
        if (!status.ok) throw new InvalidReviewerStatus(statusName)
        return [Reviewer.fromName(reviewerName), status.value] as const
      }),
    )
  }

  static fromInitialState(
    reviewers: readonly Reviewer[],
    status: ReviewerStatus,
  ): ReviewerStatuses {
    return new ReviewerStatuses(reviewers.map((reviewer) => [reviewer, status] as const))
  }

  statusByReviewer(): ReadonlyMap<Reviewer, ReviewerStatus> {
    return new Map(this.entries)
  }

  statusFor(reviewer: Reviewer): ReviewerStatus | undefined {
    return this.entries.find(([entry]) => entry.name() === reviewer.name())?.[1]
  }

  withReviewer(reviewer: Reviewer, status: ReviewerStatus): ReviewerStatuses {
    return new ReviewerStatuses(
      this.entries.map(([entry, entryStatus]) =>
        entry.name() === reviewer.name()
          ? ([entry, status] as const)
          : ([entry, entryStatus] as const),
      ),
    )
  }

  toJSON(): Readonly<Record<string, string>> {
    return Object.fromEntries(
      this.entries.map(([reviewer, status]) => [reviewer.name(), status.name()]),
    )
  }
}
