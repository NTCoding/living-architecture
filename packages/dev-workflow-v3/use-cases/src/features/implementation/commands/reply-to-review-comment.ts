import type { ReplyToReviewComment as ReplyToReviewCommentPort } from '@living-architecture/dev-workflow-v3-domain-model/domain/ports/reply-to-review-comment'

/** @riviere-role command-use-case-input */
export interface ReplyToReviewCommentInput {
  readonly pullRequestNumber: number
  readonly commentId: number
  readonly body: string
}

/** @riviere-role command-use-case-result */
export interface ReplyToReviewCommentResult {
  readonly commentId: number
}

/** @riviere-role command-use-case */
export class ReplyToReviewComment {
  constructor(private readonly replyToReviewComment: ReplyToReviewCommentPort) {}

  async execute(input: ReplyToReviewCommentInput): Promise<ReplyToReviewCommentResult> {
    await this.replyToReviewComment({
      pullRequestNumber: input.pullRequestNumber,
      commentId: input.commentId,
      body: input.body,
    })
    return { commentId: input.commentId }
  }
}
