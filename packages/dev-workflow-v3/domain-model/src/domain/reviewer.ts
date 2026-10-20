import { z } from 'zod'

const REVIEWER_NAMES = ['architecture-review', 'code-review', 'bug-scanner'] as const

const REVIEWER_SCHEMA = z.enum(REVIEWER_NAMES)

type ReviewerName = z.infer<typeof REVIEWER_SCHEMA>

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

  private constructor(private readonly reviewerName: ReviewerName) {}

  static fromName(value: string): Reviewer {
    const result = REVIEWER_SCHEMA.safeParse(value)
    if (!result.success) throw new InvalidReviewerName(value)
    return new Reviewer(result.data)
  }

  name(): ReviewerName {
    return this.reviewerName
  }

  equals(other: Reviewer): boolean {
    return this.reviewerName === other.name()
  }
}

/** @riviere-role value-object */
export class Reviewers {
  declare private readonly brand: 'Reviewers'

  private constructor(private readonly reviewerNames: readonly ReviewerName[]) {}

  static parse(value: readonly string[]): Reviewers {
    return new Reviewers(value.map((reviewerName) => Reviewer.fromName(reviewerName).name()))
  }

  static singleton(): Reviewers {
    return new Reviewers(REVIEWER_NAMES)
  }

  all(): readonly Reviewer[] {
    return this.reviewerNames.map((reviewerName) => Reviewer.fromName(reviewerName))
  }

  includes(reviewer: Reviewer): boolean {
    return this.reviewerNames.includes(reviewer.name())
  }
}
