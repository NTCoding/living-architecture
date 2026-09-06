import type { ReadWorkflowPullRequestFeedback } from '../ports/read-pull-request-feedback'

export const rateLimitEvidence = {
  repository: 'example/repo',
  prNumber: 99,
  headRevision: 'a'.repeat(40),
  statusId: 123,
  evidenceUrl: `https://api.github.com/repos/example/repo/statuses/${'a'.repeat(40)}`,
} satisfies NonNullable<ReturnType<ReadWorkflowPullRequestFeedback>['coderabbitRateLimitEvidence']>
