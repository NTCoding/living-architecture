/** @riviere-role external-client-model */
export type AcpReviewRequest = {
  readonly pullRequestNumber: number
  readonly reviewer: 'architecture-review' | 'code-review' | 'bug-scanner' | 'task-check'
}

/** @riviere-role external-client-service */
export function buildReviewPrompt(request: AcpReviewRequest): string {
  return (
    `Review pull request #${String(request.pullRequestNumber)} as ${request.reviewer}. ` +
    'Review the changed code on GitHub and post all feedback as inline comments. ' +
    `Prefix every comment with [${request.reviewer}]. ` +
    'When all your feedback is resolved, post a GitHub comment containing ' +
    `[${request.reviewer}] APPROVED. Do not return findings or a verdict to the caller.`
  )
}
