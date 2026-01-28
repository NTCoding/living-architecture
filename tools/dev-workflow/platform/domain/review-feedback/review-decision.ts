import { z } from 'zod'

const reviewStateSchema = z.enum([
  'APPROVED',
  'CHANGES_REQUESTED',
  'COMMENTED',
  'DISMISSED',
  'PENDING',
])
type ReviewState = z.infer<typeof reviewStateSchema>

export const reviewDecisionSchema = z.object({
  reviewer: z.string().min(1),
  state: reviewStateSchema,
})
export type ReviewDecision = z.infer<typeof reviewDecisionSchema>
