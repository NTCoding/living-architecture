import { Reviewers } from '@living-architecture/dev-workflow-v3-domain-model'

/** @riviere-role command-use-case-input */
export interface ParseReviewersInput {
  readonly names: readonly string[]
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
    return {
      reviewers: Reviewers.parse(input.names)
        .all()
        .map((reviewer) => reviewer.name()),
    }
  }
}
