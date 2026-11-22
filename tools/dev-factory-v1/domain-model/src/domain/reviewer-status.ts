import { z } from 'zod'

const REVIEWER_STATUS_NAMES = ['PENDING', 'RATE_LIMITED', 'OPEN_FEEDBACK', 'APPROVED'] as const

const REVIEWER_STATUS_SCHEMA = z.enum(REVIEWER_STATUS_NAMES)

type ReviewerStatusName = z.infer<typeof REVIEWER_STATUS_SCHEMA>

/** @riviere-role domain-error */
export class InvalidReviewerStatus extends Error {
  constructor(value: string) {
    super(`Unknown reviewer status: ${value}`)
    this.name = 'InvalidReviewerStatus'
  }
}

/** @riviere-role value-object */
export class ReviewerStatus {
  declare private readonly brand: 'ReviewerStatus'

  private constructor(private readonly statusName: ReviewerStatusName) {}

  static parse(value: string): ReviewerStatus {
    const result = REVIEWER_STATUS_SCHEMA.safeParse(value)
    if (!result.success) throw new InvalidReviewerStatus(value)
    return new ReviewerStatus(result.data)
  }

  name(): ReviewerStatusName {
    return this.statusName
  }

  isOpenFeedback(): boolean {
    return this.statusName === 'OPEN_FEEDBACK'
  }

  isPending(): boolean {
    return this.statusName === 'PENDING'
  }

  isApproved(): boolean {
    return this.statusName === 'APPROVED' || this.statusName === 'RATE_LIMITED'
  }
}
