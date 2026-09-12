import { z, type ZodType } from 'zod'

const REVIEWER_STATUS_NAMES = ['PENDING', 'OPEN_FEEDBACK', 'APPROVED'] as const
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

  static fromName(
    value: string,
  ):
    | { readonly ok: true; readonly value: ReviewerStatus }
    | { readonly ok: false; readonly reason: string } {
    const result = REVIEWER_STATUS_SCHEMA.safeParse(value)
    return result.success
      ? { ok: true, value: new ReviewerStatus(result.data) }
      : { ok: false, reason: `Unknown reviewer status: ${value}` }
  }

  static parse(value: string): ReviewerStatus {
    const result = ReviewerStatus.fromName(value)
    if (!result.ok) throw new InvalidReviewerStatus(value)
    return result.value
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
}

/** @riviere-role value-object */
export class ReviewStatuses {
  declare private readonly brand: 'ReviewStatuses'

  private constructor(readonly values: readonly ReviewerStatusName[]) {}

  static parse(value: readonly string[]): ReviewStatuses {
    return new ReviewStatuses(REVIEWER_STATUS_SCHEMA.array().parse(value))
  }

  static singleton(): ReviewStatuses {
    return new ReviewStatuses(REVIEWER_STATUS_NAMES)
  }

  asZodSchema(): ZodType<ReviewerStatusName> {
    return REVIEWER_STATUS_SCHEMA
  }
}
