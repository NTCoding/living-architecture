#!/usr/bin/env tsx
// Re-export from new location - will be removed after full restructure
export {
  type GetPRFeedbackContext,
  getPRFeedbackContextSchema,
} from '../features/get-pr-feedback/domain/feedback-report'
export { buildGetPRFeedbackContext } from '../features/get-pr-feedback/use-cases/get-pr-feedback'

import { runWorkflow } from '../platform/domain/workflow-execution/run-workflow'
import { buildGetPRFeedbackContext } from '../features/get-pr-feedback/use-cases/get-pr-feedback'
import type { GetPRFeedbackContext } from '../features/get-pr-feedback/domain/feedback-report'
import { fetchFeedback } from '../features/get-pr-feedback/domain/steps/fetch-feedback'

runWorkflow<GetPRFeedbackContext>([fetchFeedback], buildGetPRFeedbackContext)
