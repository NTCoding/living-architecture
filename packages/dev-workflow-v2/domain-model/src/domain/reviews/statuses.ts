import { z } from 'zod'

const REVIEWER_STATUS_SCHEMA = z.enum(['PENDING', 'OPEN_FEEDBACK', 'APPROVED'] as const)

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
