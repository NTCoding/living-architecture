import { z } from 'zod'
import type { WaitForIssueReply } from '@living-architecture/dev-workflow-v3-domain-model/domain/ports/wait-for-issue-reply'
import type {
  CommandOutput,
  CommandRequest,
} from '../../../../infra/external-clients/process/run-command'
import { ghOutput } from '../../../../infra/external-clients/github/github'

const COMMENTS_SCHEMA = z.object({
  comments: z.array(z.object({ body: z.string(), createdAt: z.string().trim().min(1) })),
})

type Dependencies = {
  readonly runCommand: (request: CommandRequest) => Promise<CommandOutput>
  readonly workingDirectory: string
  readonly wait: () => Promise<void>
  readonly attempts: number
}

async function poll(
  dependencies: Dependencies,
  issueNumber: number,
  after: string,
  remainingAttempts: number,
): Promise<Awaited<ReturnType<WaitForIssueReply>>> {
  const output = await ghOutput(dependencies.runCommand, {
    workingDirectory: dependencies.workingDirectory,
    arguments: ['issue', 'view', String(issueNumber), '--json', 'comments'],
  })
  const comments = COMMENTS_SCHEMA.parse(JSON.parse(output)).comments
  const reply = comments.find((comment) => comment.createdAt > after)
  if (reply !== undefined) return { reply: reply.body }
  if (remainingAttempts <= 1) return { reply: null }
  await dependencies.wait()
  return poll(dependencies, issueNumber, after, remainingAttempts - 1)
}

/**
 * @riviere-role domain-port-adapter
 */
export function waitForIssueReplyWithGithub(dependencies: Dependencies): WaitForIssueReply {
  return async (request) =>
    poll(dependencies, request.issueNumber, request.after, dependencies.attempts)
}
