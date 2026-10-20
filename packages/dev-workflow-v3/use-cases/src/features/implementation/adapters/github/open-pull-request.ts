import type { OpenPullRequest } from '@living-architecture/dev-workflow-v3-domain-model/domain/ports/open-pull-request'
import type {
  CommandOutput,
  CommandRequest,
} from '../../../../infra/external-clients/process/run-command'
import { createGithubPullRequest } from '../../../../infra/external-clients/github/pull-request'

/**
 * @riviere-role domain-port-adapter
 */
export function openPullRequestWithGithub(dependencies: {
  readonly runCommand: (request: CommandRequest) => Promise<CommandOutput>
}): OpenPullRequest {
  return async (request) =>
    createGithubPullRequest(dependencies.runCommand, {
      workingDirectory: request.worktreePath,
      branch: request.branch,
      title: request.title,
      body: request.body,
    })
}
