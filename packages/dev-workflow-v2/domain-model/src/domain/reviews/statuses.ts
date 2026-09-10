import { z } from 'zod'

const REVIEWER_STATUS_SCHEMA = z.enum(['PENDING', 'OPEN_FEEDBACK', 'APPROVED'] as const)
type ReviewerStatusName = z.infer<typeof REVIEWER_STATUS_SCHEMA>

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

  private constructor(readonly values: readonly z.infer<typeof REVIEWER_STATUS_SCHEMA>[]) {}

  static parse(value: readonly string[]): ReviewStatuses {
    return new ReviewStatuses(REVIEWER_STATUS_SCHEMA.array().parse(value))
  }

  static schema() {
    return REVIEWER_STATUS_SCHEMA
  }

  static pending() {
    return {
      'architecture-review': 'PENDING' as const,
      'code-review': 'PENDING' as const,
      'bug-scanner': 'PENDING' as const,
      'task-check': 'PENDING' as const,
      coderabbit: 'PENDING' as const,
    }
  }
}
