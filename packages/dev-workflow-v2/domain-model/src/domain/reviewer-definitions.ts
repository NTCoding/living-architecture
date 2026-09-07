import { z } from 'zod'
import { ReviewerSatisfaction } from './reviewer-satisfaction'

const reviewerTypeSchema = ReviewerSatisfaction.reviewerNameSchema()

const reviewerDefinitionSchema = z
  .object({
    reviewType: reviewerTypeSchema,
    agentInstructions: z.string().min(1),
    version: z.string().min(1),
  })
  .strict()

/** @riviere-role value-object */
export class ReviewerDefinition {
  declare private readonly brand: 'ReviewerDefinition'

  readonly reviewType: z.infer<typeof reviewerTypeSchema>
  readonly agentInstructions: string
  readonly version: string

  private constructor(value: z.infer<typeof reviewerDefinitionSchema>) {
    this.reviewType = value.reviewType
    this.agentInstructions = value.agentInstructions
    this.version = value.version
  }

  static parse(value: unknown): ReviewerDefinition {
    return new ReviewerDefinition(reviewerDefinitionSchema.parse(value))
  }

  static parseAll(values: readonly unknown[]): readonly ReviewerDefinition[] {
    return values.map((value) => ReviewerDefinition.parse(value))
  }
}
