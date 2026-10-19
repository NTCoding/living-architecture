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
  remainingAttempts: number,
): Promise<Awaited<ReturnType<WaitForReviewer>>> {
  try {
    const feedback = await readGithubPullRequestFeedback(dependencies.runCommand, {
      workingDirectory: dependencies.workingDirectory,
      pullRequestNumber,
    })
    if (feedback.reviewSeen || feedback.rateLimited || remainingAttempts <= 1) return feedback
  } catch {
    if (remainingAttempts <= 1) return { reviewSeen: false, rateLimited: false, comments: [] }
  }
  await dependencies.wait()
  return poll(dependencies, pullRequestNumber, remainingAttempts - 1)
}

/**
 * @riviere-role domain-port-adapter
 */
export function waitForReviewerWithGithub(dependencies: Dependencies): WaitForReviewer {
  return async (request) => poll(dependencies, request.pullRequestNumber, dependencies.attempts)
}
