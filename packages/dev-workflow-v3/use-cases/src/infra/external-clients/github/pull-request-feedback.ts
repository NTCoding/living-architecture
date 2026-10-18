import { z } from 'zod'
import type { CommandOutput, CommandRequest } from '../process/run-command'
import { ghOutput } from './github'

const CODERABBIT_LOGIN = 'coderabbitai'

const FEEDBACK_COMMENT_SCHEMA = z.object({
  id: z.number().int().positive(),
  path: z.string(),
  line: z.number().int().positive().nullable(),
  body: z.string(),
  user: z.object({ login: z.string() }).nullable(),
})

const FEEDBACK_COMMENTS_SCHEMA = z.array(FEEDBACK_COMMENT_SCHEMA)

/** @riviere-role external-client-model */
export interface GithubPullRequestFeedback {
  readonly reviewSeen: boolean
  readonly rateLimited: boolean
  readonly comments: readonly {
    readonly commentId: number
    readonly path: string
    readonly line: number
    readonly body: string
  }[]
}

/** @riviere-role external-client-service */
export async function readGithubPullRequestFeedback(
  runCommand: (request: CommandRequest) => Promise<CommandOutput>,
  request: { readonly workingDirectory: string; readonly pullRequestNumber: number },
): Promise<GithubPullRequestFeedback> {
  const output = await ghOutput(runCommand, {
    workingDirectory: request.workingDirectory,
    arguments: [
      'api',
      '--paginate',
      `repos/{owner}/{repo}/pulls/${request.pullRequestNumber}/comments`,
    ],
  })
  const comments = FEEDBACK_COMMENTS_SCHEMA.parse(JSON.parse(output)).filter(
    (comment) => comment.user?.login === CODERABBIT_LOGIN,
  )
  return {
    reviewSeen: comments.length > 0,
    rateLimited: comments.some((comment) => comment.body.includes('rate limit')),
    comments: comments.flatMap((comment) =>
      comment.line === null
        ? []
        : [
            {
              commentId: comment.id,
              path: comment.path,
              line: comment.line,
              body: comment.body,
            },
          ],
    ),
  }
}
