import { z } from 'zod'
import type { ReviewFinding } from './review-finding'

const COMMENT_IDENTIFIER_SCHEMA = z.number().int().positive()

/** @riviere-role value-object */
export class PostedReviewFinding {
  declare private readonly brand: 'PostedReviewFinding'

  private constructor(
    private readonly postedFinding: ReviewFinding,
    private readonly postedCommentId: number,
  ) {}

  static from(finding: ReviewFinding, commentId: number): PostedReviewFinding {
    return new PostedReviewFinding(finding, COMMENT_IDENTIFIER_SCHEMA.parse(commentId))
  }

  finding(): ReviewFinding {
    return this.postedFinding
  }

  commentId(): number {
    return this.postedCommentId
  }
}
