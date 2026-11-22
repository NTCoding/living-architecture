import { z } from 'zod'

const STANDARD_MAXIMUM_REVIEW_CYCLES = 3

/** @riviere-role value-object */
export class ReviewCycleLimit {
  declare private readonly brand: 'ReviewCycleLimit'

  private constructor(readonly maximum: number) {}

  static singleton(): ReviewCycleLimit {
    return new ReviewCycleLimit(STANDARD_MAXIMUM_REVIEW_CYCLES)
  }

  static parse(value: unknown): ReviewCycleLimit {
    return new ReviewCycleLimit(z.number().int().positive().parse(value))
  }

  isReached(cycleNumber: number): boolean {
    return cycleNumber >= this.maximum
  }
}
