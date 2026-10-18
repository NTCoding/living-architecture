import type { CommentOnIssue as CommentOnIssuePort } from '@living-architecture/dev-workflow-v3-domain-model/domain/ports/comment-on-issue'

/** @riviere-role command-use-case-input */
export interface CommentOnIssueInput {
  readonly issueNumber: number
  readonly body: string
}

/** @riviere-role command-use-case-result */
export interface CommentOnIssueResult {
  readonly issueNumber: number
  readonly commentId: number
  readonly createdAt: string
}

/** @riviere-role command-use-case */
export class CommentOnIssue {
  constructor(private readonly commentOnIssue: CommentOnIssuePort) {}

  async execute(input: CommentOnIssueInput): Promise<CommentOnIssueResult> {
    const posted = await this.commentOnIssue({ issueNumber: input.issueNumber, body: input.body })
    return {
      issueNumber: input.issueNumber,
      commentId: posted.commentId,
      createdAt: posted.createdAt,
    }
  }
}
