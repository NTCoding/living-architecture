import { z } from 'zod'

const AGGREGATE_REVIEW_OUTCOME_NAMES = ['PENDING', 'OPEN_FEEDBACK', 'APPROVED'] as const
const AGGREGATE_REVIEW_OUTCOME_SCHEMA = z.enum(AGGREGATE_REVIEW_OUTCOME_NAMES)

type AggregateReviewOutcomeName = (typeof AGGREGATE_REVIEW_OUTCOME_NAMES)[number]

/** @riviere-role value-object */
export class AggregateReviewOutcome {
  declare private readonly brand: 'AggregateReviewOutcome'

  private constructor(private readonly outcomeName: AggregateReviewOutcomeName) {}

  static fromName(value: string): AggregateReviewOutcome {
    return new AggregateReviewOutcome(AGGREGATE_REVIEW_OUTCOME_SCHEMA.parse(value))
  }

  name(): AggregateReviewOutcomeName {
    return this.outcomeName
  }

  isPending(): boolean {
    return this.outcomeName === 'PENDING'
  }

  isOpenFeedback(): boolean {
    return this.outcomeName === 'OPEN_FEEDBACK'
  }

  isApproved(): boolean {
    return this.outcomeName === 'APPROVED'
  }
}
