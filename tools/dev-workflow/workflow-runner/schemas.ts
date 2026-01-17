import { z } from 'zod'

export const findingSchema = z.object({
  severity: z.enum(['critical', 'major', 'minor']),
  file: z.string(),
  line: z.number().optional(),
  message: z.string(),
})
export type Finding = z.infer<typeof findingSchema>

export const agentResponseSchema = z.object({
  result: z.enum(['PASS', 'FAIL']),
  summary: z.string(),
  findings: z.array(findingSchema),
})
export type AgentResponse = z.infer<typeof agentResponseSchema>

export const reviewerResultSchema = agentResponseSchema.extend({
  name: z.string(),
  reportPath: z.string(),
})
export type ReviewerResult = z.infer<typeof reviewerResultSchema>
