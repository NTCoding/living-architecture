import { z } from 'zod'

const pageInfo = z.object({ hasNextPage: z.boolean(), endCursor: z.string().nullable() })
const author = z.object({ login: z.string() }).nullable()
const comment = z.object({ author, body: z.string(), databaseId: z.number().nullable() })
const issue = z.object({ number: z.number(), url: z.string(), title: z.string(), body: z.string() })
const thread = z.object({
  id: z.string(),
  isResolved: z.boolean(),
  isOutdated: z.boolean(),
  path: z.string().nullable(),
  line: z.number().nullable(),
  comments: z.object({ nodes: z.array(comment), pageInfo }),
})
const response = z.object({
  data: z.object({
    repository: z.object({
      pullRequest: z.object({
        closingIssuesReferences: z.object({ nodes: z.array(issue), pageInfo }),
        reviewThreads: z.object({ nodes: z.array(thread), pageInfo }),
        comments: z.object({ nodes: z.array(comment), pageInfo }),
      }),
    }),
  }),
})
const threadComments = z.object({
  data: z.object({ node: z.object({ comments: z.object({ nodes: z.array(comment), pageInfo }) }) }),
})
const pullRequest = z.object({
  number: z.number(),
  url: z.string(),
  title: z.string(),
  body: z.string(),
  base: z.object({ ref: z.string(), sha: z.string() }),
  head: z.object({ sha: z.string() }),
})
const repository = z.object({ owner: z.object({ login: z.string() }), name: z.string() })

type GhRunner = (argumentsList: readonly string[]) => string
type PageInfo = z.infer<typeof pageInfo>
type Issue = z.infer<typeof issue>
type Thread = z.infer<typeof thread>
type Comment = z.infer<typeof comment>

/** @riviere-role external-client-model */
export interface ReviewInputPullRequest {
  readonly pr: {
    readonly number: number
    readonly url: string
    readonly title: string
    readonly body: string
    readonly baseRef: string
    readonly baseCommit: string
    readonly headCommit: string
  }
  readonly linkedIssues: readonly Issue[]
  readonly reviewThreads: readonly {
    readonly id: string
    readonly isResolved: boolean
    readonly isOutdated: boolean
    readonly path: string | null
    readonly line: number | null
    readonly comments: readonly Comment[]
  }[]
  readonly decisionHistory: readonly Comment[]
}

class IncompleteGithubPaginationError extends Error {}

function cursor(info: PageInfo): string | undefined {
  if (!info.hasNextPage) return undefined
  if (info.endCursor === null)
    throw new IncompleteGithubPaginationError(
      'GitHub pagination was incomplete: next page cursor absent.',
    )
  return info.endCursor
}
function query(runGh: GhRunner, source: string) {
  return response.parse(JSON.parse(runGh(['api', 'graphql', '-f', `query=${source}`])))
}
function prQuery(owner: string, name: string, number: number, fields: string): string {
  return `{ repository(owner: ${JSON.stringify(owner)}, name: ${JSON.stringify(name)}) { pullRequest(number: ${String(number)}) { ${fields} } } }`
}
function allIssues(
  runGh: GhRunner,
  owner: string,
  name: string,
  number: number,
  values: readonly Issue[],
  info: PageInfo,
): readonly Issue[] {
  const next = cursor(info)
  if (next === undefined) return values
  const page = query(
    runGh,
    prQuery(
      owner,
      name,
      number,
      `closingIssuesReferences(first: 100, after: ${JSON.stringify(next)}) { nodes { number url title body } pageInfo { hasNextPage endCursor } } reviewThreads(first: 100) { nodes { id isResolved isOutdated path line comments(first: 100) { nodes { author { login } body databaseId } pageInfo { hasNextPage endCursor } } } pageInfo { hasNextPage endCursor } } comments(first: 100) { nodes { author { login } body databaseId } pageInfo { hasNextPage endCursor } }`,
    ),
  ).data.repository.pullRequest.closingIssuesReferences
  return allIssues(runGh, owner, name, number, [...values, ...page.nodes], page.pageInfo)
}
function allThreads(
  runGh: GhRunner,
  owner: string,
  name: string,
  number: number,
  values: readonly Thread[],
  info: PageInfo,
): readonly Thread[] {
  const next = cursor(info)
  if (next === undefined) return values
  const page = query(
    runGh,
    prQuery(
      owner,
      name,
      number,
      `closingIssuesReferences(first: 100) { nodes { number url title body } pageInfo { hasNextPage endCursor } } reviewThreads(first: 100, after: ${JSON.stringify(next)}) { nodes { id isResolved isOutdated path line comments(first: 100) { nodes { author { login } body databaseId } pageInfo { hasNextPage endCursor } } } pageInfo { hasNextPage endCursor } } comments(first: 100) { nodes { author { login } body databaseId } pageInfo { hasNextPage endCursor } }`,
    ),
  ).data.repository.pullRequest.reviewThreads
  return allThreads(runGh, owner, name, number, [...values, ...page.nodes], page.pageInfo)
}
function allPrComments(
  runGh: GhRunner,
  owner: string,
  name: string,
  number: number,
  values: readonly Comment[],
  info: PageInfo,
): readonly Comment[] {
  const next = cursor(info)
  if (next === undefined) return values
  const page = query(
    runGh,
    prQuery(
      owner,
      name,
      number,
      `closingIssuesReferences(first: 100) { nodes { number url title body } pageInfo { hasNextPage endCursor } } reviewThreads(first: 100) { nodes { id isResolved isOutdated path line comments(first: 100) { nodes { author { login } body databaseId } pageInfo { hasNextPage endCursor } } } pageInfo { hasNextPage endCursor } } comments(first: 100, after: ${JSON.stringify(next)}) { nodes { author { login } body databaseId } pageInfo { hasNextPage endCursor } }`,
    ),
  ).data.repository.pullRequest.comments
  return allPrComments(runGh, owner, name, number, [...values, ...page.nodes], page.pageInfo)
}
function allThreadComments(
  runGh: GhRunner,
  item: Thread,
  values: readonly Comment[],
  info: PageInfo,
): readonly Comment[] {
  const next = cursor(info)
  if (next === undefined) return values
  const source = `{ node(id: ${JSON.stringify(item.id)}) { ... on PullRequestReviewThread { comments(first: 100, after: ${JSON.stringify(next)}) { nodes { author { login } body databaseId } pageInfo { hasNextPage endCursor } } } } }`
  const page = threadComments.parse(JSON.parse(runGh(['api', 'graphql', '-f', `query=${source}`])))
    .data.node.comments
  return allThreadComments(runGh, item, [...values, ...page.nodes], page.pageInfo)
}

/** @riviere-role external-client-service */
export function createGithubReviewInputsClient(
  runGh: GhRunner,
): (prNumber: number) => ReviewInputPullRequest {
  return (prNumber) => {
    const repo = repository.parse(JSON.parse(runGh(['repo', 'view', '--json', 'owner,name'])))
    const pr = pullRequest.parse(
      JSON.parse(
        runGh(['api', `repos/${repo.owner.login}/${repo.name}/pulls/${String(prNumber)}`]),
      ),
    )
    const fields =
      'closingIssuesReferences(first: 100) { nodes { number url title body } pageInfo { hasNextPage endCursor } } reviewThreads(first: 100) { nodes { id isResolved isOutdated path line comments(first: 100) { nodes { author { login } body databaseId } pageInfo { hasNextPage endCursor } } } pageInfo { hasNextPage endCursor } } comments(first: 100) { nodes { author { login } body databaseId } pageInfo { hasNextPage endCursor } }'
    const initial = query(runGh, prQuery(repo.owner.login, repo.name, prNumber, fields)).data
      .repository.pullRequest
    const threads = allThreads(
      runGh,
      repo.owner.login,
      repo.name,
      prNumber,
      initial.reviewThreads.nodes,
      initial.reviewThreads.pageInfo,
    )
    return {
      pr: {
        number: pr.number,
        url: pr.url,
        title: pr.title,
        body: pr.body,
        baseRef: pr.base.ref,
        baseCommit: pr.base.sha,
        headCommit: pr.head.sha,
      },
      linkedIssues: allIssues(
        runGh,
        repo.owner.login,
        repo.name,
        prNumber,
        initial.closingIssuesReferences.nodes,
        initial.closingIssuesReferences.pageInfo,
      ),
      reviewThreads: threads.map((item) => ({
        ...item,
        comments: allThreadComments(runGh, item, item.comments.nodes, item.comments.pageInfo),
      })),
      decisionHistory: allPrComments(
        runGh,
        repo.owner.login,
        repo.name,
        prNumber,
        initial.comments.nodes,
        initial.comments.pageInfo,
      ).filter((item) => item.body.startsWith('[main-agent]')),
    }
  }
}
