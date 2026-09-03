import { z } from 'zod'

const pageInfoSchema = z.object({
  hasNextPage: z.boolean(),
  endCursor: z.string().nullable(),
})

const threadCommentSchema = z.object({
  author: z.object({ login: z.string() }).nullable(),
  body: z.string(),
  createdAt: z.string(),
  url: z.string().optional(),
})

const graphqlThreadNodeSchema = z.object({
  id: z.string(),
  isResolved: z.boolean(),
  isOutdated: z.boolean(),
  path: z.string().nullable(),
  line: z.number().nullable(),
  comments: z.object({
    nodes: z.array(threadCommentSchema),
    pageInfo: pageInfoSchema,
  }),
})

const graphqlReviewNodeSchema = z.object({
  author: z.object({ login: z.string() }).nullable(),
  body: z.string(),
  state: z.string(),
  submittedAt: z.string().nullable(),
})

const graphqlResponseSchema = z.object({
  data: z.object({
    repository: z.object({
      pullRequest: z.object({
        reviewDecision: z.string().nullable(),
        reviews: z.object({
          nodes: z.array(graphqlReviewNodeSchema),
          pageInfo: pageInfoSchema,
        }),
        reviewThreads: z.object({
          nodes: z.array(graphqlThreadNodeSchema),
          pageInfo: pageInfoSchema,
        }),
      }),
    }),
  }),
})

const reviewsResponseSchema = z.object({
  data: z.object({
    repository: z.object({
      pullRequest: z.object({
        reviews: z.object({
          nodes: z.array(graphqlReviewNodeSchema),
          pageInfo: pageInfoSchema,
        }),
      }),
    }),
  }),
})

const threadsResponseSchema = z.object({
  data: z.object({
    repository: z.object({
      pullRequest: z.object({
        reviewThreads: z.object({
          nodes: z.array(graphqlThreadNodeSchema),
          pageInfo: pageInfoSchema,
        }),
      }),
    }),
  }),
})

const commentsResponseSchema = z.object({
  data: z.object({
    node: z.object({
      comments: z.object({
        nodes: z.array(threadCommentSchema),
        pageInfo: pageInfoSchema,
      }),
    }),
  }),
})

const repoInfoSchema = z.object({
  owner: z.object({ login: z.string() }),
  name: z.string(),
})

type GraphqlReview = z.infer<typeof graphqlReviewNodeSchema>
type GraphqlThread = z.infer<typeof graphqlThreadNodeSchema>
type GraphqlThreadComment = z.infer<typeof threadCommentSchema>

interface GithubUnresolvedThread {
  readonly id: string
  readonly isResolved: boolean
  readonly isOutdated: boolean
  readonly path: string | null
  readonly line: number | null
  readonly comments: readonly GithubThreadComment[]
}

interface GithubThreadComment {
  readonly author: { readonly login: string } | null
  readonly body: string
  readonly url?: string
}

interface CodeRabbitFeedback {
  readonly body: string
  readonly createdAt: string
}

class GithubPaginationError extends Error {}

/** @riviere-role external-client-model */
export interface GithubPullRequestFeedback {
  readonly reviewDecision: string | null
  readonly coderabbitReviewSeen: boolean
  readonly coderabbitRateLimited: boolean
  readonly unresolvedCount: number
  readonly threads: readonly GithubUnresolvedThread[]
}

/** @riviere-role external-client-model */
type GhRunner = (ghArguments: readonly string[]) => string

function isCodeRabbitAuthor(login: string | undefined): boolean {
  return login === 'coderabbitai' || login === 'coderabbitai[bot]'
}

function indicatesCodeRabbitRateLimit(body: string): boolean {
  return /review rate limited/i.test(body)
}

function afterCursor(cursor: string): string {
  return `, after: ${JSON.stringify(cursor)}`
}

function nextPageCursor(pageInfo: z.infer<typeof pageInfoSchema>): string | undefined {
  if (!pageInfo.hasNextPage) return undefined
  if (pageInfo.endCursor === null) {
    throw new GithubPaginationError('Expected a cursor for the next GitHub GraphQL page.')
  }
  return pageInfo.endCursor
}

function queryGithub(runGh: GhRunner, query: string): string {
  return runGh(['api', 'graphql', '-f', `query=${query}`])
}

function readAllReviews(
  runGh: GhRunner,
  repositoryOwner: string,
  repositoryName: string,
  prNumber: number,
  reviews: readonly GraphqlReview[],
  pageInfo: z.infer<typeof pageInfoSchema>,
): readonly GraphqlReview[] {
  const cursor = nextPageCursor(pageInfo)
  if (cursor === undefined) return reviews
  const query = `{ repository(owner: "${repositoryOwner}", name: "${repositoryName}") { pullRequest(number: ${String(prNumber)}) { reviews(first: 100${afterCursor(cursor)}) { nodes { author { login } body state submittedAt } pageInfo { hasNextPage endCursor } } } } }`
  const response = reviewsResponseSchema.parse(JSON.parse(queryGithub(runGh, query)))
  const reviewPage = response.data.repository.pullRequest.reviews
  return readAllReviews(
    runGh,
    repositoryOwner,
    repositoryName,
    prNumber,
    [...reviews, ...reviewPage.nodes],
    reviewPage.pageInfo,
  )
}

function readAllThreadComments(
  runGh: GhRunner,
  thread: GraphqlThread,
  comments: readonly GraphqlThreadComment[],
  pageInfo: z.infer<typeof pageInfoSchema>,
): readonly GraphqlThreadComment[] {
  const cursor = nextPageCursor(pageInfo)
  if (cursor === undefined) return comments
  const query = `{ node(id: "${thread.id}") { ... on PullRequestReviewThread { comments(first: 100${afterCursor(cursor)}) { nodes { body createdAt url author { login } } pageInfo { hasNextPage endCursor } } } } }`
  const response = commentsResponseSchema.parse(JSON.parse(queryGithub(runGh, query)))
  const commentPage = response.data.node.comments
  return readAllThreadComments(
    runGh,
    thread,
    [...comments, ...commentPage.nodes],
    commentPage.pageInfo,
  )
}

function readAllThreads(
  runGh: GhRunner,
  repositoryOwner: string,
  repositoryName: string,
  prNumber: number,
  threads: readonly GraphqlThread[],
  pageInfo: z.infer<typeof pageInfoSchema>,
): readonly GraphqlThread[] {
  const cursor = nextPageCursor(pageInfo)
  if (cursor === undefined) return threads
  const query = `{ repository(owner: "${repositoryOwner}", name: "${repositoryName}") { pullRequest(number: ${String(prNumber)}) { reviewThreads(first: 100${afterCursor(cursor)}) { nodes { id isResolved isOutdated path line comments(first: 100) { nodes { body createdAt url author { login } } pageInfo { hasNextPage endCursor } } } pageInfo { hasNextPage endCursor } } } } }`
  const response = threadsResponseSchema.parse(JSON.parse(queryGithub(runGh, query)))
  const threadPage = response.data.repository.pullRequest.reviewThreads
  return readAllThreads(
    runGh,
    repositoryOwner,
    repositoryName,
    prNumber,
    [...threads, ...threadPage.nodes],
    threadPage.pageInfo,
  )
}

function mostRecentCodeRabbitFeedback(
  reviews: readonly GraphqlReview[],
  activeThreads: readonly {
    readonly comments: {
      readonly nodes: readonly GraphqlThreadComment[]
    }
  }[],
): CodeRabbitFeedback | undefined {
  const reviewFeedback = reviews.flatMap((review) => {
    if (!isCodeRabbitAuthor(review.author?.login) || review.submittedAt === null) return []
    return [
      {
        body: review.body,
        createdAt: review.submittedAt,
      },
    ]
  })
  const threadFeedback = activeThreads.flatMap((thread) =>
    thread.comments.nodes.flatMap((comment) => {
      if (!isCodeRabbitAuthor(comment.author?.login)) return []
      return [
        {
          body: comment.body,
          createdAt: comment.createdAt,
        },
      ]
    }),
  )
  return [...reviewFeedback, ...threadFeedback].reduce<CodeRabbitFeedback | undefined>(
    (mostRecent, feedback) => {
      if (mostRecent === undefined || feedback.createdAt > mostRecent.createdAt) return feedback
      return mostRecent
    },
    undefined,
  )
}

/** @riviere-role external-client-service */
export function createGithubPullRequestFeedbackClient(
  runGh: GhRunner,
): (prNumber: number) => GithubPullRequestFeedback {
  return (prNumber: number): GithubPullRequestFeedback => {
    const repoRaw = runGh(['repo', 'view', '--json', 'owner,name'])
    const repo = repoInfoSchema.parse(JSON.parse(repoRaw))
    const query = `{ repository(owner: "${repo.owner.login}", name: "${repo.name}") { pullRequest(number: ${String(prNumber)}) { reviewDecision reviews(first: 100) { nodes { author { login } body state submittedAt } pageInfo { hasNextPage endCursor } } reviewThreads(first: 100) { nodes { id isResolved isOutdated path line comments(first: 100) { nodes { body createdAt url author { login } } pageInfo { hasNextPage endCursor } } } pageInfo { hasNextPage endCursor } } } } }`
    const response = graphqlResponseSchema.parse(JSON.parse(queryGithub(runGh, query)))
    const pullRequest = response.data.repository.pullRequest
    const reviews = readAllReviews(
      runGh,
      repo.owner.login,
      repo.name,
      prNumber,
      pullRequest.reviews.nodes,
      pullRequest.reviews.pageInfo,
    )
    const threads = readAllThreads(
      runGh,
      repo.owner.login,
      repo.name,
      prNumber,
      pullRequest.reviewThreads.nodes,
      pullRequest.reviewThreads.pageInfo,
    ).map((thread) => ({
      ...thread,
      comments: {
        nodes: readAllThreadComments(
          runGh,
          thread,
          thread.comments.nodes,
          thread.comments.pageInfo,
        ),
        pageInfo: thread.comments.pageInfo,
      },
    }))
    const unresolved = threads.filter((thread) => !thread.isResolved && !thread.isOutdated)
    const currentCodeRabbitFeedback = mostRecentCodeRabbitFeedback(reviews, unresolved)
    return {
      reviewDecision: pullRequest.reviewDecision,
      coderabbitReviewSeen: reviews.some((review) => isCodeRabbitAuthor(review.author?.login)),
      coderabbitRateLimited:
        currentCodeRabbitFeedback !== undefined &&
        indicatesCodeRabbitRateLimit(currentCodeRabbitFeedback.body),
      unresolvedCount: unresolved.length,
      threads: unresolved.map((thread) => ({
        ...thread,
        comments: thread.comments.nodes.map((comment) => ({
          author: comment.author,
          body: comment.body,
          ...(comment.url === undefined ? {} : { url: comment.url }),
        })),
      })),
    }
  }
}
