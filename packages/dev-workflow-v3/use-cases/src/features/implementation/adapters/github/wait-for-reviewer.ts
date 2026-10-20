import type { WaitForReviewer } from '@living-architecture/dev-workflow-v3-domain-model/domain/ports/wait-for-reviewer'
import type {
  CommandOutput,
  CommandRequest,
} from '../../../../infra/external-clients/process/run-command'
import { readGithubPullRequestFeedback } from '../../../../infra/external-clients/github/pull-request-feedback'

type Dependencies = {
  readonly runCommand: (request: CommandRequest) => Promise<CommandOutput>
  readonly workingDirectory: string
  readonly wait: () => Promise<void>
  readonly attempts: number
}

async function poll(
  dependencies: Dependencies,
  pullRequestNumber: number,
  commitSha: string,
  remainingAttempts: number,
  gracePeriodPending: boolean,
): Promise<Awaited<ReturnType<WaitForReviewer>>> {
  if (gracePeriodPending) await dependencies.wait()
  try {
    const feedback = await readGithubPullRequestFeedback(dependencies.runCommand, {
      workingDirectory: dependencies.workingDirectory,
      pullRequestNumber,
      commitSha,
    })
    if (feedback.reviewSeen || feedback.rateLimited || remainingAttempts <= 1) return feedback
  } catch {
    if (remainingAttempts <= 1) return didNotReview()
  }
  await dependencies.wait()
  return poll(dependencies, pullRequestNumber, commitSha, remainingAttempts - 1, false)
}

/**
 * @riviere-role domain-port-adapter
 */
export function waitForReviewerWithGithub(dependencies: Dependencies): WaitForReviewer {
  return async (request) =>
    poll(dependencies, request.pullRequestNumber, request.commitSha, dependencies.attempts, true)
}

function didNotReview(): Awaited<ReturnType<WaitForReviewer>> {
  return { reviewSeen: false, rateLimited: false, verdict: null, summary: null, comments: [] }
}
