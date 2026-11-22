import { Reviewers } from '@dev-factory-v1/domain-model'

/** @riviere-role command-use-case-input */
export interface ParseReviewersInput {
  readonly names: readonly string[] | undefined
}

/** @riviere-role command-use-case-result */
export interface ParseReviewersResult {
  readonly reviewers: readonly string[]
}

/**
 * @riviere-role command-use-case
 */
export class ParseReviewers {
  execute(input: ParseReviewersInput): ParseReviewersResult {
    const reviewers =
      input.names === undefined ? Reviewers.singleton() : Reviewers.parse(input.names)
    return {
      reviewers: reviewers.all().map((reviewer) => reviewer.name()),
    }
  }
}
