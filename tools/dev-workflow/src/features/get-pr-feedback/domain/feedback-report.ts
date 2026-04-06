import { z } from 'zod'
import { baseContextSchema } from '../../../platform/domain/workflow-execution/workflow-runner'
import type { FormattedFeedbackItem } from '../../../platform/domain/review-feedback/review-thread'
import type { ReviewDecision } from '../../../platform/domain/review-feedback/review-decision'

const prStateSchema = z.enum(['merged', 'open', 'closed', 'not_found'])
/** @riviere-role value-object */
export type PRState = z.infer<typeof prStateSchema>

const getPRFeedbackContextSchema = baseContextSchema.extend({
  prNumber: z.number().optional(),
  prUrl: z.string().optional(),
  prState: prStateSchema.optional(),
  includeResolved: z.boolean(),
})
/** @riviere-role value-object */
export type GetPRFeedbackContext = z.infer<typeof getPRFeedbackContextSchema>

/** @riviere-role value-object */
export interface CheckRunSummary {
  name: string
  conclusion: string | null
}

/** @riviere-role value-object */
export interface PRFeedbackStatus {
  branch: string
  state: PRState
  prNumber?: number
  prUrl?: string
  mergeableState: string | null
  reviewDecisions: ReviewDecision[]
  mergeable: boolean
  failedChecks?: CheckRunSummary[]
  feedback: FormattedFeedbackItem[]
  feedbackCount: number
  instruction?: string
}
