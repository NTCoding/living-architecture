import { z } from 'zod'

const findingSchema = z.object({
  severity: z.enum(['critical', 'major', 'minor']),
  file: z.string(),
  line: z.number().optional(),
  message: z.string(),
})

export const agentResponseSchema = z.object({
  result: z.enum(['PASS', 'FAIL']),
  summary: z.string(),
  findings: z.array(findingSchema),
})

const reviewerResultSchema = agentResponseSchema.extend({
  name: z.string(),
  reportPath: z.string(),
})
export type ReviewerResult = z.infer<typeof reviewerResultSchema>
