import { ReviewFinding } from './review-finding'
import { Reviewer } from './agents/reviewer'
import { ReviewerStatus } from './reviewer-status'

/** @riviere-role domain-error */
export class InconsistentReviewVerdict extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InconsistentReviewVerdict'
  }
}

/** @riviere-role value-object */
export class ReviewVerdict {
  declare private readonly brand: 'ReviewVerdict'

  private constructor(
    private readonly verdictReviewer: Reviewer,
    private readonly verdictStatus: ReviewerStatus,
    private readonly verdictFindings: readonly ReviewFinding[],
  ) {}

  static from(
    reviewer: Reviewer,
    status: ReviewerStatus,
    findings: readonly ReviewFinding[],
  ): ReviewVerdict {
    if (status.isPending()) {
      throw new InconsistentReviewVerdict('A reviewer that returns a verdict cannot be pending.')
    }
    if (status.isApproved() && findings.length > 0) {
      throw new InconsistentReviewVerdict('An approving verdict cannot carry findings.')
    }
    if (status.isOpenFeedback() && findings.length === 0) {
      throw new InconsistentReviewVerdict(
        'A verdict with open feedback needs at least one finding.',
      )
    }
    return new ReviewVerdict(reviewer, status, findings)
  }

  static parse(input: {
    readonly reviewer: string
    readonly status: string
    readonly findings: readonly {
      readonly file: string
      readonly line: number
      readonly rule: string | null
      readonly summary: string
    }[]
  }): ReviewVerdict {
    const reviewer = Reviewer.fromName(input.reviewer)
    const findings = input.findings.map((finding) => ReviewFinding.parse({ ...finding, reviewer }))
    return ReviewVerdict.from(reviewer, ReviewerStatus.parse(input.status), findings)
  }

  reviewer(): Reviewer {
    return this.verdictReviewer
  }

  status(): ReviewerStatus {
    return this.verdictStatus
  }

  findings(): readonly ReviewFinding[] {
    return this.verdictFindings
  }
}
