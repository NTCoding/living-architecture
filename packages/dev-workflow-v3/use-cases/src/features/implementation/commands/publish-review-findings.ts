import { ReviewFinding, Reviewer } from '@living-architecture/dev-workflow-v3-domain-model'
import type { PublishReviewFinding } from '@living-architecture/dev-workflow-v3-domain-model/domain/ports/publish-review-finding'

/** @riviere-role command-use-case-result-value */
export interface ReviewFindingResult {
  readonly reviewer: string
  readonly file: string
  readonly line: number
  readonly rule: string | null
  readonly summary: string
}

/** @riviere-role command-use-case-result-value */
export interface PostedReviewFindingResult {
  readonly file: string
  readonly line: number
  readonly commentId: number
}

/** @riviere-role command-use-case-input */
export interface PublishReviewFindingsInput {
  readonly pullRequestNumber: number
  readonly findings: readonly ReviewFindingResult[]
}

/** @riviere-role command-use-case-result */
export interface PublishReviewFindingsResult {
  readonly posted: readonly PostedReviewFindingResult[]
}

/** @riviere-role command-use-case */
export class PublishReviewFindings {
  constructor(private readonly publishReviewFinding: PublishReviewFinding) {}

  async execute(input: PublishReviewFindingsInput): Promise<PublishReviewFindingsResult> {
    const posted: PostedReviewFindingResult[] = []
    for (const reported of input.findings) {
      const finding = ReviewFinding.parse({
        reviewer: Reviewer.fromName(reported.reviewer),
        file: reported.file,
        line: reported.line,
        rule: reported.rule,
        summary: reported.summary,
      })
      const { commentId } = await this.publishReviewFinding({
        pullRequestNumber: input.pullRequestNumber,
        comment: {
          path: finding.file(),
          line: finding.line(),
          body: `[dev-workflow-v3] [${finding.reviewer().name()}] ${finding.body()}`,
        },
      })
      posted.push({ file: finding.file(), line: finding.line(), commentId })
    }
    return { posted }
  }
}
