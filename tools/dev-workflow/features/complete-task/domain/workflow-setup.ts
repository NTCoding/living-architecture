import { mkdir } from 'node:fs/promises'
import type { DebugLog } from '../../../platform/domain/debug-log'
import type { CompleteTaskContext } from './task-to-complete'
import { resolvePRDetails } from './pull-request-draft'
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
import {
  type CliReader,
  parsePRMode,
  parseNumberArg,
  validateCreateMode,
  validateUpdateMode,
  buildReviewDir,
} from './complete-task-cli-parser'

export interface ContextDeps {
  currentBranch: () => Promise<string>
  getIssue: (issueNumber: number) => Promise<{
    title: string
    body: string
  }>
  findPRForBranch: (branch: string) => Promise<number | undefined>
  parseIssueNumber: (branch: string) => number | undefined
  cliReader: CliReader
  parseOptionalArg: (name: string) => string | undefined
}

export interface StepDeps {
  verifyBuild: VerifyBuildDeps
  codeReview: Omit<CodeReviewDeps, 'debugLog'> & { debugLog?: DebugLog }
  submitPR: SubmitPRDeps
  fetchPRFeedback: FetchPRFeedbackDeps
}

export async function buildCompleteTaskContext(deps: ContextDeps): Promise<CompleteTaskContext> {
  const branch = await deps.currentBranch()
  const reviewDir = buildReviewDir(branch)
  const prMode = parsePRMode(deps.cliReader)

  await mkdir(reviewDir, { recursive: true })

  const issueNumber = deps.parseIssueNumber(branch)
  const taskDetails = issueNumber ? await deps.getIssue(issueNumber) : undefined
  const existingPrNumber = await deps.findPRForBranch(branch)

  if (prMode === 'create') {
    validateCreateMode(existingPrNumber)
    const cliArgs = {
      prTitle: deps.parseOptionalArg('--pr-title'),
      prBody: deps.parseOptionalArg('--pr-body'),
    }
    const prDetails = resolvePRDetails(cliArgs, issueNumber, taskDetails)

    return {
      branch,
      reviewDir,
      prMode,
      hasIssue: prDetails.hasIssue,
      issueNumber: prDetails.issueNumber,
      taskDetails: prDetails.taskDetails,
      prTitle: prDetails.prTitle,
      prBody: prDetails.prBody,
      prNumber: existingPrNumber,
    }
  }

  const feedbackItemsResolved = parseNumberArg(deps.cliReader, '--feedback-items-resolved')
  const feedbackItemsRemaining = parseNumberArg(deps.cliReader, '--feedback-items-remaining')
  validateUpdateMode(existingPrNumber, feedbackItemsRemaining)

  return {
    branch,
    reviewDir,
    prMode,
    hasIssue: Boolean(issueNumber),
    issueNumber,
    taskDetails,
    prNumber: existingPrNumber,
    feedbackItemsResolved,
    feedbackItemsRemaining,
  }
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
