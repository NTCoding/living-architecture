#!/usr/bin/env tsx
import { runWorkflow } from '../../../platform/domain/workflow-execution/run-workflow'
import { buildGetPRFeedbackContext } from '../use-cases/get-pr-feedback'
import type { GetPRFeedbackContext } from '../domain/feedback-report'
import { fetchFeedback } from '../domain/steps/fetch-feedback'

runWorkflow<GetPRFeedbackContext>([fetchFeedback], buildGetPRFeedbackContext)
