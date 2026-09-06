import { z } from 'zod'
import { readGithubCodeRabbitStatus } from './get-coderabbit-status'
import type { GithubCodeRabbitStatus } from './get-coderabbit-status'

const pageInfoSchema = z.object({ hasNextPage: z.boolean(), endCursor: z.string().nullable() })
const threadCommentSchema = z.object({
  author: z.object({ login: z.string() }).nullable(),
  body: z.string(),
  url: z.string().optional(),
})
const commentsSchema = z.object({ nodes: z.array(threadCommentSchema), pageInfo: pageInfoSchema })
const graphqlThreadNodeSchema = z.object({
  id: z.string(),
  isResolved: z.boolean(),
  isOutdated: z.boolean(),
  path: z.string().nullable(),
  line: z.number().nullable(),
  comments: commentsSchema,
})
const threadsSchema = z.object({
  nodes: z.array(graphqlThreadNodeSchema),
  pageInfo: pageInfoSchema,
})
const revisionSchema = z.string().regex(/^[0-9a-f]{40}$/)
const graphqlResponseSchema = z.object({
  data: z.object({
    repository: z.object({
      pullRequest: z.object({
        headRefOid: revisionSchema,
        reviewDecision: z.string().nullable(),
        reviewThreads: threadsSchema,
      }),
    }),
  }),
})
const threadsResponseSchema = z.object({
  data: z.object({
    repository: z.object({ pullRequest: z.object({ reviewThreads: threadsSchema }) }),
  }),
})
const commentsResponseSchema = z.object({
  data: z.object({ node: z.object({ comments: commentsSchema }) }),
})
const repoInfoSchema = z.object({ owner: z.object({ login: z.string() }), name: z.string() })
const headResponseSchema = z.object({ headRefOid: revisionSchema })
type GraphqlThread = z.infer<typeof graphqlThreadNodeSchema>
type GraphqlThreadComment = z.infer<typeof threadCommentSchema>
type GhRunner = (arguments_: readonly string[]) => string

const threadFields =
  'id isResolved isOutdated path line comments(first: 100) { nodes { body url author { login } } pageInfo { hasNextPage endCursor } }'

class GithubPaginationError extends Error {}
class GithubPullRequestChangedError extends Error {}

/** @riviere-role external-client-model */
export interface GithubPullRequestFeedback {
  readonly repository: string
  readonly headRevision: string
  readonly reviewDecision: string | null
  readonly codeRabbitStatus: GithubCodeRabbitStatus | { readonly type: 'not-requested' }
  readonly unresolvedCount: number
  readonly threads: readonly {
    readonly id: string
    readonly isResolved: boolean
    readonly isOutdated: boolean
    readonly path: string | null
    readonly line: number | null
    readonly comments: readonly GraphqlThreadComment[]
  }[]
}

function nextPageCursor(
  pageInfo: z.infer<typeof pageInfoSchema>,
  seen: readonly string[],
): string | undefined {
  if (!pageInfo.hasNextPage) return undefined
  if (pageInfo.endCursor === null)
    throw new GithubPaginationError('Expected a cursor for the next GitHub GraphQL page.')
  if (seen.includes(pageInfo.endCursor))
    throw new GithubPaginationError('GitHub repeated a pagination cursor.')
  return pageInfo.endCursor
}

function queryGithub(runGh: GhRunner, query: string): string {
  return runGh(['api', 'graphql', '-f', `query=${query}`])
}

function repositoryQuery(owner: string, name: string, prNumber: number, fields: string): string {
  return `{ repository(owner: ${JSON.stringify(owner)}, name: ${JSON.stringify(name)}) { pullRequest(number: ${String(prNumber)}) { ${fields} } } }`
}

function readAllThreadComments(
  runGh: GhRunner,
  threadId: string,
  comments: readonly GraphqlThreadComment[],
  pageInfo: z.infer<typeof pageInfoSchema>,
  seen: readonly string[],
): readonly GraphqlThreadComment[] {
  const cursor = nextPageCursor(pageInfo, seen)
  if (cursor === undefined) return comments
  const query = `{ node(id: ${JSON.stringify(threadId)}) { ... on PullRequestReviewThread { comments(first: 100, after: ${JSON.stringify(cursor)}) { nodes { body url author { login } } pageInfo { hasNextPage endCursor } } } }`
  const response = commentsResponseSchema.parse(JSON.parse(queryGithub(runGh, query)))
  const page = response.data.node.comments
  return readAllThreadComments(runGh, threadId, [...comments, ...page.nodes], page.pageInfo, [
    ...seen,
    cursor,
  ])
}

function readAllThreads(
  runGh: GhRunner,
  repository: z.infer<typeof repoInfoSchema>,
  prNumber: number,
  threads: readonly GraphqlThread[],
  pageInfo: z.infer<typeof pageInfoSchema>,
  seen: readonly string[],
): readonly GraphqlThread[] {
  const cursor = nextPageCursor(pageInfo, seen)
  if (cursor === undefined) return threads
  const query = repositoryQuery(
    repository.owner.login,
    repository.name,
    prNumber,
    `reviewThreads(first: 100, after: ${JSON.stringify(cursor)}) { nodes { ${threadFields} } pageInfo { hasNextPage endCursor } }`,
  )
  const response = threadsResponseSchema.parse(JSON.parse(queryGithub(runGh, query)))
  const page = response.data.repository.pullRequest.reviewThreads
  return readAllThreads(runGh, repository, prNumber, [...threads, ...page.nodes], page.pageInfo, [
    ...seen,
    cursor,
  ])
}

/** @riviere-role external-client-service */
export function createGithubPullRequestFeedbackClient(
  runGh: GhRunner,
): (
  prNumber: number,
  options?: { readonly includeCodeRabbitStatus: boolean },
) => GithubPullRequestFeedback {
  return (prNumber, options = { includeCodeRabbitStatus: true }) => {
    const repository = repoInfoSchema.parse(
      JSON.parse(runGh(['repo', 'view', '--json', 'owner,name'])),
    )
    const query = repositoryQuery(
      repository.owner.login,
      repository.name,
      prNumber,
      `headRefOid reviewDecision reviewThreads(first: 100) { nodes { ${threadFields} } pageInfo { hasNextPage endCursor } }`,
    )
    const response = graphqlResponseSchema.parse(JSON.parse(queryGithub(runGh, query)))
    const pullRequest = response.data.repository.pullRequest
    const threads = readAllThreads(
      runGh,
      repository,
      prNumber,
      pullRequest.reviewThreads.nodes,
      pullRequest.reviewThreads.pageInfo,
      [],
    )
      .filter((thread) => !thread.isResolved)
      .map((thread) => ({
        ...thread,
        comments: readAllThreadComments(
          runGh,
          thread.id,
          thread.comments.nodes,
          thread.comments.pageInfo,
          [],
        ),
      }))
    const codeRabbitStatus = options.includeCodeRabbitStatus
      ? readGithubCodeRabbitStatus(
          runGh,
          `${repository.owner.login}/${repository.name}`,
          pullRequest.headRefOid,
        )
      : ({ type: 'not-requested' } as const)
    const latestHead = headResponseSchema.parse(
      JSON.parse(runGh(['pr', 'view', String(prNumber), '--json', 'headRefOid'])),
    )
    if (latestHead.headRefOid !== pullRequest.headRefOid)
      throw new GithubPullRequestChangedError('PR head changed while reading feedback.')
    return {
      repository: `${repository.owner.login}/${repository.name}`,
      headRevision: pullRequest.headRefOid,
      reviewDecision: pullRequest.reviewDecision,
      codeRabbitStatus,
      unresolvedCount: threads.length,
      threads,
    }
  }
}
