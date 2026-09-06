import type { ReadWorkflowPullRequestFeedback } from '@living-architecture/dev-workflow-v2-domain-model/domain/ports/read-pull-request-feedback'
import type { GithubPullRequestFeedback } from '../../../../infra/external-clients/github/get-pr-feedback'

const incompleteReview = { coderabbitReviewSeen: false, coderabbitRateLimited: false }
const codeRabbitFlags = {
  pending: incompleteReview,
  'not-requested': incompleteReview,
  unsupported: incompleteReview,
  failed: incompleteReview,
  completed: { coderabbitReviewSeen: true, coderabbitRateLimited: false },
  'rate-limited': { coderabbitReviewSeen: false, coderabbitRateLimited: true },
} satisfies Record<
  GithubPullRequestFeedback['codeRabbitStatus']['type'],
  {
    readonly coderabbitReviewSeen: boolean
    readonly coderabbitRateLimited: boolean
  }
>

/** @riviere-role domain-port-adapter */
export function createWorkflowPullRequestFeedbackReader(
  readGithubPullRequestFeedback: (
    prNumber: number,
    options: { readonly includeCodeRabbitStatus: boolean },
  ) => GithubPullRequestFeedback,
): ReadWorkflowPullRequestFeedback {
  return (prNumber, options) => {
    const feedback = readGithubPullRequestFeedback(prNumber, options)
    return {
      repository: feedback.repository,
      headRevision: feedback.headRevision,
      codeRabbitReview: feedback.codeRabbitStatus,
      ...codeRabbitFlags[feedback.codeRabbitStatus.type],
      ...(feedback.codeRabbitStatus.type === 'rate-limited'
        ? {
            coderabbitRateLimitEvidence: {
              repository: feedback.repository,
              prNumber,
              headRevision: feedback.headRevision,
              statusId: feedback.codeRabbitStatus.statusId,
              evidenceUrl: feedback.codeRabbitStatus.evidenceUrl,
            },
          }
        : {}),
      reviewDecision: feedback.reviewDecision,
      threads: feedback.threads.map((thread) => ({
        comments: thread.comments.map((comment) => ({
          author: comment.author,
          body: comment.body,
          ...(comment.url === undefined ? {} : { url: comment.url }),
        })),
        id: thread.id,
        isOutdated: thread.isOutdated,
        isResolved: thread.isResolved,
        line: thread.line,
        path: thread.path,
      })),
      unresolvedCount: feedback.unresolvedCount,
    }
  }
}
