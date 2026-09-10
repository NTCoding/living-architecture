import { z } from 'zod'

const REVIEWER_NAMES = [
  'architecture-review',
  'code-review',
  'bug-scanner',
  'task-check',
  'coderabbit',
] as const

const REVIEWER_SCHEMA = z.enum(REVIEWER_NAMES)

/** @riviere-role domain-error */
export class InvalidReviewerName extends Error {
  constructor(value: string) {
    super(`Unknown reviewer: ${value}`)
    this.name = 'InvalidReviewerName'
  }
}

/** @riviere-role value-object */
export class Reviewer {
  declare private readonly brand: 'Reviewer'

  private constructor(private readonly reviewerName: z.infer<typeof REVIEWER_SCHEMA>) {}

  static fromName(value: string): Reviewer {
    const result = REVIEWER_SCHEMA.safeParse(value)
    if (!result.success) throw new InvalidReviewerName(value)
    return new Reviewer(result.data)
  }

  static schema() {
    return REVIEWER_SCHEMA
  }

  name(): z.infer<typeof REVIEWER_SCHEMA> {
    return this.reviewerName
  }
}

/** @riviere-role value-object */
export class Reviewers {
  declare private readonly brand: 'Reviewers'

  private constructor(readonly values: readonly z.infer<typeof REVIEWER_SCHEMA>[]) {}

  static parse(value: readonly string[]): Reviewers {
    return new Reviewers(value.map((reviewer) => Reviewer.fromName(reviewer).name()))
  }
}
