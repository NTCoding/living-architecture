import { z } from 'zod'
import type { ReviewFinding } from './review-finding'

/**
 * What has arrived on the pull request from the reviewer we do not run
 * ourselves, which is CodeRabbit.
 * @riviere-role value-object
 */
export class PullRequestFeedback {
  declare private readonly brand: 'PullRequestFeedback'

  private constructor(
    private readonly reviewSeen: boolean,
    private readonly rateLimited: boolean,
    private readonly feedbackFindings: readonly ReviewFinding[],
  ) {}

  static from(input: {
    readonly reviewSeen: boolean
    readonly rateLimited: boolean
    readonly findings: readonly ReviewFinding[]
  }): PullRequestFeedback {
    return new PullRequestFeedback(
      z.boolean().parse(input.reviewSeen),
      z.boolean().parse(input.rateLimited),
      input.findings,
    )
  }

  hasReview(): boolean {
    return this.reviewSeen
  }

  isRateLimited(): boolean {
    return this.rateLimited
  }

  isSettled(): boolean {
    return this.reviewSeen || this.rateLimited
  }

  findings(): readonly ReviewFinding[] {
    return this.feedbackFindings
  }

  hasOpenFeedback(): boolean {
    return this.feedbackFindings.length > 0
  }
}
