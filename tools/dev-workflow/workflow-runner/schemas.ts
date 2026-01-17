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

type AgentResponse = z.infer<typeof agentResponseSchema>

export interface ReviewerResult extends AgentResponse {
  name: string
  reportPath: string
}
