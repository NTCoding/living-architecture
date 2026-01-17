import { z } from 'zod'
import { taskDetailsSchema } from '../workflow-runner/workflow-runner'

export const prDetailsSchema = z.object({
  prTitle: z.string(),
  prBody: z.string(),
  commitMessage: z.string(),
  hasIssue: z.boolean(),
  issueNumber: z.number().optional(),
  taskDetails: taskDetailsSchema.optional(),
})

export type PRDetails = z.infer<typeof prDetailsSchema>
