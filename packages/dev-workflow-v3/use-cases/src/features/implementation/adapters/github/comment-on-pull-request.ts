import type { CommentOnPullRequest } from '@living-architecture/dev-workflow-v3-domain-model/domain/ports/comment-on-pull-request'
import type {
  CommandOutput,
  CommandRequest,
} from '../../../../infra/external-clients/process/run-command'
import { ghOutput } from '../../../../infra/external-clients/github/github'

/**
 * @riviere-role domain-port-adapter
 */
export function commentOnPullRequestWithGithub(dependencies: {
  readonly runCommand: (request: CommandRequest) => Promise<CommandOutput>
  readonly workingDirectory: string
}): CommentOnPullRequest {
  return async (request) => {
    await ghOutput(dependencies.runCommand, {
      workingDirectory: dependencies.workingDirectory,
      arguments: ['pr', 'comment', String(request.pullRequestNumber), '--body', request.body],
    })
  }
}
