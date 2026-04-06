import { z } from 'zod'

const reviewStateSchema = z.enum([
  'APPROVED',
  'CHANGES_REQUESTED',
  'COMMENTED',
  'DISMISSED',
  'PENDING',
])

export const reviewDecisionSchema = z.object({
  reviewer: z.string().min(1),
  state: reviewStateSchema,
})
/** @riviere-role value-object */
export type ReviewDecision = z.infer<typeof reviewDecisionSchema>
