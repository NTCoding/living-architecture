import { z } from 'zod'

const threadCommentSchema = z.object({
  author: z.object({ login: z.string() }).nullable(),
  body: z.string(),
})

const reviewThreadSchema = z.object({
  id: z.string(),
  isResolved: z.boolean(),
  isOutdated: z.boolean(),
  path: z.string().nullable(),
  line: z.number().nullable(),
  comments: z.array(threadCommentSchema),
})

const graphqlThreadNodeSchema = z.object({
  id: z.string(),
  isResolved: z.boolean(),
  isOutdated: z.boolean(),
  path: z.string().nullable(),
  line: z.number().nullable(),
  comments: z.object({ nodes: z.array(threadCommentSchema) }),
})

const graphqlResponseSchema = z.object({data: z.object({repository: z.object({pullRequest: z.object({reviewThreads: z.object({ nodes: z.array(graphqlThreadNodeSchema) }),}),}),}),})

const repoInfoSchema = z.object({
  owner: z.object({ login: z.string() }),
  name: z.string(),
})

/** @riviere-role external-client-model */
export type UnresolvedThread = z.infer<typeof reviewThreadSchema>

/** @riviere-role external-client-model */
export interface PRFeedbackResult {
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
    const query = `{ repository(owner: "${repo.owner.login}", name: "${repo.name}") { pullRequest(number: ${String(prNumber)}) { reviewThreads(first: 100) { nodes { id isResolved isOutdated path line comments(first: 100) { nodes { body author { login } } } } } } } }`
    const raw = runGh(`api graphql -f query='${query}'`)
    const response = graphqlResponseSchema.parse(JSON.parse(raw))
    const threads = response.data.repository.pullRequest.reviewThreads.nodes.map((node) => ({
      ...node,
      comments: node.comments.nodes,
    }))
    const unresolved = threads.filter((t) => !t.isResolved)
    return {
      unresolvedCount: unresolved.length,
      threads: unresolved,
    }
  }
}
