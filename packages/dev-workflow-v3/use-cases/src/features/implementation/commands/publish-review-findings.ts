import {
  PostedReviewFinding,
  type PullRequestReference,
  type ReviewFinding,
} from '@living-architecture/dev-workflow-v3-domain-model'
import type { PublishReviewFinding } from '@living-architecture/dev-workflow-v3-domain-model/domain/ports/publish-review-finding'

/** @riviere-role command-use-case-input */
export interface PublishReviewFindingsInput {
  readonly pullRequest: PullRequestReference
  readonly findings: readonly ReviewFinding[]
}

/** @riviere-role command-use-case-result */
export interface PublishReviewFindingsResult {
  readonly posted: readonly PostedReviewFinding[]
}

/** @riviere-role command-use-case */
export class PublishReviewFindings {
  constructor(private readonly publishReviewFinding: PublishReviewFinding) {}

  async execute(input: PublishReviewFindingsInput): Promise<PublishReviewFindingsResult> {
    const posted: PostedReviewFinding[] = []
    for (const finding of input.findings) {
      const { commentId } = await this.publishReviewFinding({
        pullRequestNumber: input.pullRequest.number(),
        comment: { path: finding.file(), line: finding.line(), body: finding.body() },
      })
      posted.push(PostedReviewFinding.from(finding, commentId))
    }
    return { posted }
  }
}
