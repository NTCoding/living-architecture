import type { DebugLog } from '../../../platform/domain/debug-log'
import type { CompleteTaskContext } from './task-to-complete'
import {
  createVerifyBuildStep, type VerifyBuildDeps 
} from './steps/verify-build'
import {
  createCodeReviewStep, type CodeReviewDeps 
} from './steps/run-code-review'
import {
  createSubmitPRStep, type SubmitPRDeps 
} from './steps/submit-pull-request'
import {
  createFetchPRFeedbackStep, type FetchPRFeedbackDeps 
} from './steps/fetch-feedback'

export interface StepDeps {
  verifyBuild: VerifyBuildDeps
  codeReview: Omit<CodeReviewDeps, 'debugLog'> & { debugLog?: DebugLog }
  submitPR: SubmitPRDeps
  fetchPRFeedback: FetchPRFeedbackDeps
}

export function buildSteps(deps: StepDeps) {
  return [
    createVerifyBuildStep(deps.verifyBuild),
    createCodeReviewStep(deps.codeReview),
    createSubmitPRStep(deps.submitPR),
    createFetchPRFeedbackStep(deps.fetchPRFeedback),
  ]
}

export function resolveTimingsFilePath(ctx: CompleteTaskContext): string {
  return `${ctx.reviewDir}/timings.md`
}

export function resolveOutputFilePath(ctx: CompleteTaskContext): string {
  return `${ctx.reviewDir}/output.json`
}
