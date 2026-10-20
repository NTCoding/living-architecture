import { z } from 'zod'
import type { CommandOutput, CommandRequest } from '../process/run-command'
import { ghOutput } from './github'

const CODERABBIT_LOGINS = ['coderabbitai', 'coderabbitai[bot]']

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
  readonly verdict: 'approved' | 'changes-requested' | 'commented' | null
  readonly summary: string | null
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
  const reviews = await ghOutput(runCommand, {
    workingDirectory: request.workingDirectory,
    arguments: [
      'api',
      '--paginate',
      `repos/{owner}/{repo}/pulls/${request.pullRequestNumber}/reviews`,
    ],
  })
  const parsedReviews = REVIEW_SCHEMA.parse(JSON.parse(reviews))
  const comments = FEEDBACK_COMMENTS_SCHEMA.parse(JSON.parse(output)).filter((comment) =>
    isCoderabbit(comment.user?.login),
  )
  const verdict = coderabbitVerdictOf(parsedReviews)
  return {
    reviewSeen: verdict !== null || comments.length > 0,
    rateLimited: comments.some((comment) => comment.body.includes('rate limit')),
    verdict,
    summary: lastCoderabbitBody(parsedReviews),
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

const REVIEW_SCHEMA = z.array(
  z.object({
    state: z.string(),
    body: z.string().nullable(),
    user: z.object({ login: z.string() }).nullable(),
  }),
)

function isCoderabbit(login: string | undefined): boolean {
  return login !== undefined && CODERABBIT_LOGINS.includes(login)
}

function coderabbitVerdictOf(
  reviews: z.infer<typeof REVIEW_SCHEMA>,
): 'approved' | 'changes-requested' | 'commented' | null {
  const last = latestCoderabbitReview(reviews)
  if (last === undefined) return null
  if (last.state === 'APPROVED') return 'approved'
  if (last.state === 'CHANGES_REQUESTED') return 'changes-requested'
  if (last.state === 'COMMENTED') return 'commented'
  return null
}

function latestCoderabbitReview(reviews: z.infer<typeof REVIEW_SCHEMA>) {
  return reviews.filter((review) => isCoderabbit(review.user?.login)).at(-1)
}

function lastCoderabbitBody(reviews: z.infer<typeof REVIEW_SCHEMA>): string | null {
  return latestCoderabbitReview(reviews)?.body ?? null
}
