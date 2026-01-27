import { z } from 'zod'
import {
  baseContextSchema,
  taskDetailsSchema,
} from '../../../platform/domain/workflow-execution/workflow-runner'

export const completeTaskContextSchema = baseContextSchema.extend({
  reviewDir: z.string(),
  hasIssue: z.boolean(),
  issueNumber: z.number().optional(),
  taskDetails: taskDetailsSchema.optional(),
  commitMessage: z.string(),
  prTitle: z.string(),
  prBody: z.string(),
  prNumber: z.number().optional(),
  prUrl: z.string().optional(),
})
export type CompleteTaskContext = z.infer<typeof completeTaskContextSchema>
