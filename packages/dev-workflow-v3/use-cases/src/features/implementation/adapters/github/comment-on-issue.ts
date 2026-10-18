import type { CommentOnIssue } from '@living-architecture/dev-workflow-v3-domain-model/domain/ports/comment-on-issue'
import type {
  CommandOutput,
  CommandRequest,
} from '../../../../infra/external-clients/process/run-command'
import { ghOutput } from '../../../../infra/external-clients/github/github'

/**
 * @riviere-role domain-port-adapter
 */
export function commentOnIssueWithGithub(dependencies: {
  readonly runCommand: (request: CommandRequest) => Promise<CommandOutput>
  readonly workingDirectory: string
}): CommentOnIssue {
  return async (request) => {
    await ghOutput(dependencies.runCommand, {
      workingDirectory: dependencies.workingDirectory,
      arguments: ['issue', 'comment', String(request.issueNumber), '--body', request.body],
    })
  }
}
