import type { ReplyToReviewComment } from '@living-architecture/dev-workflow-v3-domain-model/domain/ports/reply-to-review-comment'
import type {
  CommandOutput,
  CommandRequest,
} from '../../../../infra/external-clients/process/run-command'
import { ghOutput } from '../../../../infra/external-clients/github/github'

/**
 * @riviere-role domain-port-adapter
 */
export function replyToReviewCommentWithGithub(dependencies: {
  readonly runCommand: (request: CommandRequest) => Promise<CommandOutput>
  readonly workingDirectory: string
}): ReplyToReviewComment {
  return async (request) => {
    await ghOutput(dependencies.runCommand, {
      workingDirectory: dependencies.workingDirectory,
      arguments: [
        'api',
        '--method',
        'POST',
        `repos/{owner}/{repo}/pulls/${request.pullRequestNumber}/comments/${request.commentId}/replies`,
        '--field',
        `body=${request.body}`,
      ],
    })
  }
}
