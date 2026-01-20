import { z } from 'zod'
import { baseContextSchema } from '../../../platform/domain/workflow-execution/workflow-runner'
import type { FormattedFeedbackItem } from '../../../platform/domain/review-feedback/review-thread'
import type { ReviewDecision } from '../../../platform/domain/review-feedback/review-decision'

const prStateSchema = z.enum(['merged', 'open', 'closed', 'not_found'])
export type PRState = z.infer<typeof prStateSchema>

export const getPRFeedbackContextSchema = baseContextSchema.extend({
  prNumber: z.number().optional(),
  prUrl: z.string().optional(),
  prState: prStateSchema.optional(),
  includeResolved: z.boolean(),
})
export type GetPRFeedbackContext = z.infer<typeof getPRFeedbackContextSchema>

export interface PRFeedbackStatus {
  branch: string
  state: PRState
  prNumber?: number
  prUrl?: string
  mergeableState: string | null
  reviewDecisions: ReviewDecision[]
  mergeable: boolean
  feedback: FormattedFeedbackItem[]
  feedbackCount: number
}
