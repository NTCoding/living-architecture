import { z } from 'zod'
import {
  baseContextSchema,
  taskDetailsSchema,
} from '../../../platform/domain/workflow-execution/workflow-runner'

export const prModeSchema = z.enum(['create', 'update'])
export type PRMode = z.infer<typeof prModeSchema>

const completeTaskContextSchema = baseContextSchema.extend({
  reviewDir: z.string(),
  prMode: prModeSchema,
  hasIssue: z.boolean(),
  issueNumber: z.number().optional(),
  taskDetails: taskDetailsSchema.optional(),
  prTitle: z.string().optional(),
  prBody: z.string().optional(),
  prNumber: z.number().optional(),
  prUrl: z.string().optional(),
  feedbackItemsResolved: z.number().optional(),
  feedbackItemsRemaining: z.number().optional(),
})
export type CompleteTaskContext = z.infer<typeof completeTaskContextSchema>
