#!/usr/bin/env tsx
import { runWorkflow } from '../workflow-runner/run-workflow'
import { buildGetPRFeedbackContext } from './context-builder'
import { fetchFeedback } from './steps/fetch-feedback'

runWorkflow([fetchFeedback], buildGetPRFeedbackContext)
