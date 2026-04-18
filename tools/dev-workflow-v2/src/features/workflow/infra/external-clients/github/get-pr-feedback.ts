import { z } from 'zod'

const threadCommentSchema = z.object({
  author: z.object({ login: z.string() }).nullable(),
  body: z.string(),
  url: z.string().optional(),
})

const graphqlThreadNodeSchema = z.object({
  id: z.string(),
  isResolved: z.boolean(),
  isOutdated: z.boolean(),
  path: z.string().nullable(),
  line: z.number().nullable(),
  comments: z.object({ nodes: z.array(threadCommentSchema) }),
})

const graphqlReviewNodeSchema = z.object({
  author: z.object({ login: z.string() }).nullable(),
  state: z.string(),
})

const graphqlResponseSchema = z.object({
  data: z.object({
    repository: z.object({
      pullRequest: z.object({
        reviewDecision: z.string().nullable(),
        reviews: z.object({ nodes: z.array(graphqlReviewNodeSchema) }),
        reviewThreads: z.object({ nodes: z.array(graphqlThreadNodeSchema) }),
      }),
    }),
  }),
})

const repoInfoSchema = z.object({
  owner: z.object({ login: z.string() }),
  name: z.string(),
})

/** @riviere-role external-client-model */
export interface UnresolvedThread {
  readonly id: string
  readonly isResolved: boolean
  readonly isOutdated: boolean
  readonly path: string | null
  readonly line: number | null
  readonly comments: readonly z.infer<typeof threadCommentSchema>[]
}

/** @riviere-role external-client-model */
export interface PRFeedbackResult {
  readonly reviewDecision: string | null
  readonly coderabbitReviewSeen: boolean
  readonly unresolvedCount: number
  readonly threads: readonly UnresolvedThread[]
}

/** @riviere-role external-client-model */
export type GhRunner = (ghArgs: string) => string

/** @riviere-role external-client-service */
export function createGetPrFeedback(runGh: GhRunner): (prNumber: number) => PRFeedbackResult {
  return (prNumber: number): PRFeedbackResult => {
    const repoRaw = runGh('repo view --json owner,name')
    const repo = repoInfoSchema.parse(JSON.parse(repoRaw))
    const query = [
      '{ repository(owner: "',
      repo.owner.login,
      '", name: "',
      repo.name,
      '") { pullRequest(number: ',
      String(prNumber),
      ') { reviewDecision reviews(first: 100) { nodes { author { login } state } } reviewThreads(first: 100) { nodes { id isResolved isOutdated path line comments(first: 100) { nodes { body url author { login } } } } } } } }',
    ].join('')
    const raw = runGh(`api graphql -f query='${query}'`)
    const response = graphqlResponseSchema.parse(JSON.parse(raw))
    const reviews = response.data.repository.pullRequest.reviews.nodes
    const threads = response.data.repository.pullRequest.reviewThreads.nodes.map((node) => ({
      ...node,
      comments: node.comments.nodes,
    }))
    const unresolved = threads.filter((thread) => !thread.isResolved && !thread.isOutdated)
    return {
      reviewDecision: response.data.repository.pullRequest.reviewDecision,
      coderabbitReviewSeen: reviews.some(
        (review) =>
          review.author?.login === 'coderabbitai' || review.author?.login === 'coderabbitai[bot]',
      ),
      unresolvedCount: unresolved.length,
      threads: unresolved,
    }
  }
}
