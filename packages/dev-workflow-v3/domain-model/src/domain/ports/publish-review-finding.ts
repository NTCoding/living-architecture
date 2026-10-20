/**
 * @riviere-role domain-port
 * @riviere-role-justification The reviewers return findings and a deterministic step posts them. The result carries the comment id, so a later cycle can reply in the same thread instead of opening a second one.
 */
export type PublishReviewFinding = (request: {
  readonly pullRequestNumber: number
  readonly comment: {
    readonly path: string
    readonly line: number
    readonly body: string
  }
}) => Promise<{ readonly commentId: number }>
