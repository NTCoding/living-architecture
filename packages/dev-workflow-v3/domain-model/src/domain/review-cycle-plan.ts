import type { Reviewer } from './reviewer'

/** @riviere-role value-object */
export class ReviewCyclePlan {
  declare private readonly brand: 'ReviewCyclePlan'

  private constructor(
    private readonly includedReviewers: readonly Reviewer[],
    private readonly excludedReviewers: readonly Reviewer[],
  ) {}

  static from(included: readonly Reviewer[], excluded: readonly Reviewer[]): ReviewCyclePlan {
    return new ReviewCyclePlan(included, excluded)
  }

  included(): readonly Reviewer[] {
    return this.includedReviewers
  }

  excluded(): readonly Reviewer[] {
    return this.excludedReviewers
  }

  isEmpty(): boolean {
    return this.includedReviewers.length === 0
  }
}
