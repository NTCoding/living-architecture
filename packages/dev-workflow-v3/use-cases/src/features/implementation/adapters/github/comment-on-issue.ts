import { z } from 'zod'
import type { CommentOnIssue } from '@living-architecture/dev-workflow-v3-domain-model/domain/ports/comment-on-issue'
import type {
  CommandOutput,
  CommandRequest,
} from '../../../../infra/external-clients/process/run-command'
import { ghOutput } from '../../../../infra/external-clients/github/github'

const CREATED_COMMENT_SCHEMA = z.object({
  id: z.number().int().positive(),
  created_at: z.string().trim().min(1),
})

/**
 * @riviere-role domain-port-adapter
 */
export function commentOnIssueWithGithub(dependencies: {
  readonly runCommand: (request: CommandRequest) => Promise<CommandOutput>
  readonly workingDirectory: string
}): CommentOnIssue {
  return async (request) => {
    const output = await ghOutput(dependencies.runCommand, {
      workingDirectory: dependencies.workingDirectory,
      arguments: [
        'api',
        '--method',
        'POST',
        `repos/{owner}/{repo}/issues/${request.issueNumber}/comments`,
        '--field',
        `body=${request.body}`,
      ],
    })
    const created = CREATED_COMMENT_SCHEMA.parse(JSON.parse(output))
    return { commentId: created.id, createdAt: created.created_at }
  }
}
