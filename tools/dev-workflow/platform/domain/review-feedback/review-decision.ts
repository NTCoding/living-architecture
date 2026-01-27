import { z } from 'zod'

const reviewDecisionSchema = z.object({
  reviewer: z.string(),
  state: z.string(),
})
export type ReviewDecision = z.infer<typeof reviewDecisionSchema>
