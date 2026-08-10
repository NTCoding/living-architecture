import type { GithubPullRequestFeedback } from '../../../../platform/infra/external-clients/github/index'
import type { ReadWorkflowPullRequestFeedback } from '../../domain/ports/read-pull-request-feedback'

/** @riviere-role domain-port-adapter */
export function createWorkflowPullRequestFeedbackReader(
  readGithubPullRequestFeedback: (prNumber: number) => GithubPullRequestFeedback,
): ReadWorkflowPullRequestFeedback {
  return (prNumber) => {
    const feedback = readGithubPullRequestFeedback(prNumber)
    return {
      coderabbitReviewSeen: feedback.coderabbitReviewSeen,
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
