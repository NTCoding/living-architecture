#!/usr/bin/env tsx
import { runWorkflow } from './run-workflow'
import { verifyBuild } from './steps/verify-build'
import { codeReview } from './steps/code-review'
import { submitPR } from './steps/submit-pr'
import { fetchPRFeedback } from './steps/fetch-pr-feedback'

runWorkflow([verifyBuild, codeReview, submitPR, fetchPRFeedback])
