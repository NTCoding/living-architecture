import type { ReadWorkflowPullRequestFeedback } from './ports/read-pull-request-feedback'

const REVIEW_RUNNERS = ['architecture-review', 'code-review', 'bug-scanner', 'task-check'] as const
const CODERABBIT_POLL_INTERVAL_MS = 15_000
const MAX_REVIEW_COMPLETION_POLLS = 120

type CodeRabbitDependencies = {
  readonly getPrFeedback: (prNumber: number) => ReturnType<ReadWorkflowPullRequestFeedback>
  readonly sleepMs: (milliseconds: number) => void
}

/** @riviere-role domain-service
 * @riviere-role-justification The aggregate does not own externally observed review results, so this evaluates the external feedback passed through its port.
 */
export function waitForCodeRabbitCompletion(
  dependencies: CodeRabbitDependencies,
  prNumber: number,
  remainingPolls: number = MAX_REVIEW_COMPLETION_POLLS,
): ReturnType<ReadWorkflowPullRequestFeedback> {
  const feedback = dependencies.getPrFeedback(prNumber)
  if (feedback.coderabbitReviewSeen || feedback.coderabbitRateLimited || remainingPolls === 1)
    return feedback
  dependencies.sleepMs(CODERABBIT_POLL_INTERVAL_MS)
  return waitForCodeRabbitCompletion(dependencies, prNumber, remainingPolls - 1)
}

/** @riviere-role domain-service
 * @riviere-role-justification The aggregate receives externally observed outcomes and requires this mapping to close its review cycle.
 */
export function reviewCycleOutcomes(
  feedback: ReturnType<ReadWorkflowPullRequestFeedback>,
  includedReviewers: readonly string[],
): Readonly<Record<string, string>> {
  const outcomes: Record<string, string> = {}
  for (const reviewer of REVIEW_RUNNERS) {
    if (includedReviewers.includes(reviewer))
      outcomes[reviewer] = feedback.reviewerStatuses[reviewer]
  }
  outcomes['coderabbit'] = codeRabbitOutcome(feedback)
  return outcomes
}

function codeRabbitOutcome(
  feedback: ReturnType<ReadWorkflowPullRequestFeedback>,
): 'PENDING' | 'RATE_LIMITED' | 'OPEN_FEEDBACK' | 'APPROVED' {
  if (feedback.coderabbitRateLimited) return 'RATE_LIMITED'
  if (!feedback.coderabbitReviewSeen) return 'PENDING'
  const openThread = feedback.threads.some(
    (thread) =>
      !thread.isResolved &&
      !thread.isOutdated &&
      thread.comments.some(
        (comment) =>
          comment.author?.login === 'coderabbitai' || comment.author?.login === 'coderabbitai[bot]',
      ),
  )
  return openThread ? 'OPEN_FEEDBACK' : 'APPROVED'
}
