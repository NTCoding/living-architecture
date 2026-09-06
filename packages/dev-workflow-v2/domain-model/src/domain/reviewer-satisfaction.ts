import { z } from 'zod'
import { reviewVerdictSchema } from '@nt-ai-lab/deterministic-agent-workflow-engine'

const receipt = {
  reviewId: z.number().int().positive(),
  headRevision: z.string().regex(/^[0-9a-f]{40}$/),
}
const satisfactionSchema = z
  .discriminatedUnion('status', [
    z.object({ status: z.literal('not-run') }),
    z.object({ status: z.literal('unsatisfied'), ...receipt }),
    z.object({ status: z.literal('satisfied'), ...receipt }),
  ])
  .readonly()
  .default({ status: 'not-run' })
const rosterSchema = z
  .object({
    'architecture-review': satisfactionSchema,
    'code-review': satisfactionSchema,
    'bug-scanner': satisfactionSchema,
    'task-check': satisfactionSchema,
  })
  .strict()
  .readonly()
const reviewerNameSchema = rosterSchema.unwrap().keyof()
const completionSchema = z
  .object({
    reviewType: reviewerNameSchema,
    verdict: reviewVerdictSchema,
    ...receipt,
  })
  .strict()
const completionStatuses = {
  PASS: 'satisfied',
  FAIL: 'unsatisfied',
} as const satisfies Record<z.infer<typeof reviewVerdictSchema>, 'satisfied' | 'unsatisfied'>

/** @riviere-role value-object */
export class ReviewerSatisfaction {
  declare private readonly brand: 'ReviewerSatisfaction'

  private constructor(private readonly reviewers: z.infer<typeof rosterSchema>) {}

  static parse(value: unknown): ReviewerSatisfaction {
    return new ReviewerSatisfaction(rosterSchema.parse(value))
  }

  static initial(): ReviewerSatisfaction {
    return ReviewerSatisfaction.parse({})
  }

  static reviewerNameSchema() {
    return reviewerNameSchema
  }

  static completionSchema() {
    return completionSchema
  }

  static snapshotSchema() {
    return rosterSchema
  }

  static requiredReviewers(): readonly z.infer<typeof reviewerNameSchema>[] {
    return Object.freeze([...reviewerNameSchema.options])
  }

  recordCompletion(value: unknown): ReviewerSatisfaction {
    const completion = completionSchema.parse(value)
    if (this.reviewers[completion.reviewType].status === 'satisfied') return this
    return ReviewerSatisfaction.parse({
      ...this.reviewers,
      [completion.reviewType]: {
        status: completionStatuses[completion.verdict],
        reviewId: completion.reviewId,
        headRevision: completion.headRevision,
      },
    })
  }

  reviewersNeedingReview(): readonly z.infer<typeof reviewerNameSchema>[] {
    return ReviewerSatisfaction.requiredReviewers().filter(
      (name) => this.reviewers[name].status !== 'satisfied',
    )
  }

  allSatisfied(): boolean {
    return this.reviewersNeedingReview().length === 0
  }

  toJSON(): z.infer<typeof rosterSchema> {
    return this.reviewers
  }
}
