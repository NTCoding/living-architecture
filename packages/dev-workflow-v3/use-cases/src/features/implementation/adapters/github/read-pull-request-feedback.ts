import type { ReadPullRequestFeedback } from '@living-architecture/dev-workflow-v3-domain-model/domain/ports/read-pull-request-feedback'
import type {
  CommandOutput,
  CommandRequest,
} from '../../../../infra/external-clients/process/run-command'
import { readGithubPullRequestFeedback } from '../../../../infra/external-clients/github/pull-request-feedback'

/**
 * @riviere-role domain-port-adapter
 */
export function readPullRequestFeedbackWithGithub(dependencies: {
  readonly runCommand: (request: CommandRequest) => Promise<CommandOutput>
  readonly workingDirectory: string
}): ReadPullRequestFeedback {
  return async (request) =>
    readGithubPullRequestFeedback(dependencies.runCommand, {
      workingDirectory: dependencies.workingDirectory,
      pullRequestNumber: request.pullRequestNumber,
    })
}
