import type { CommentOnPullRequest as CommentOnPullRequestPort } from '@dev-factory-v1/domain-model/domain/ports/comment-on-pull-request'

/** @riviere-role command-use-case-input */
export interface CommentOnPullRequestInput {
  readonly pullRequestNumber: number
  readonly body: string
}

/** @riviere-role command-use-case-result */
export interface CommentOnPullRequestResult {
  readonly pullRequestNumber: number
}

/** @riviere-role command-use-case */
export class CommentOnPullRequest {
  constructor(private readonly commentOnPullRequest: CommentOnPullRequestPort) {}

  async execute(input: CommentOnPullRequestInput): Promise<CommentOnPullRequestResult> {
    await this.commentOnPullRequest({
      pullRequestNumber: input.pullRequestNumber,
      body: input.body,
    })
    return { pullRequestNumber: input.pullRequestNumber }
  }
}
