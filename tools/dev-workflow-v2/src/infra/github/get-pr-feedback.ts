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

const ghPrViewResponseSchema = z.object({ reviewThreads: z.array(reviewThreadSchema) })

export type UnresolvedThread = z.infer<typeof reviewThreadSchema>

export interface PRFeedbackResult {
  readonly unresolvedCount: number
  readonly threads: readonly UnresolvedThread[]
}

export type GhRunner = (ghArgs: string) => string

export function createGetPrFeedback(runGh: GhRunner): (prNumber: number) => PRFeedbackResult {
  return (prNumber: number): PRFeedbackResult => {
    const raw = runGh(`pr view ${String(prNumber)} --json reviewThreads`)
    const data = ghPrViewResponseSchema.parse(JSON.parse(raw))
    const unresolved = data.reviewThreads.filter((t) => !t.isResolved)
    return {
      unresolvedCount: unresolved.length,
      threads: unresolved,
    }
  }
}
