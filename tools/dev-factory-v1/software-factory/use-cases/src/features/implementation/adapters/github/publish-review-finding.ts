import type { PublishReviewFinding } from '@dev-factory-v1/domain-model/domain/ports/publish-review-finding'
import type {
  CommandOutput,
  CommandRequest,
} from '../../../../infra/external-clients/process/run-command'
import { createGithubReviewComment } from '../../../../infra/external-clients/github/review-comment'

/**
 * @riviere-role domain-port-adapter
 */
export function publishReviewFindingWithGithub(dependencies: {
  readonly runCommand: (request: CommandRequest) => Promise<CommandOutput>
  readonly workingDirectory: string
}): PublishReviewFinding {
  return async (request) => ({
    commentId: await createGithubReviewComment(dependencies.runCommand, {
      workingDirectory: dependencies.workingDirectory,
      pullRequestNumber: request.pullRequestNumber,
      comment: request.comment,
    }),
  })
}
