#!/usr/bin/env tsx
import { z } from 'zod'
import { mkdir } from 'node:fs/promises'
import { runWorkflow } from '../workflow-runner/run-workflow'
import {
  baseContextSchema,
  taskDetailsSchema,
  type WorkflowResult,
} from '../workflow-runner/workflow-runner'
import { git } from '../external-clients/git'
import { github } from '../external-clients/github'
import { parseIssueNumber } from '../conventions/branch'
import { verifyBuild } from './steps/verify-build'
import { codeReview } from './steps/code-review'
import { submitPR } from './steps/submit-pr'
import { fetchPRFeedback } from './steps/fetch-pr-feedback'
import { formatCompleteTaskResult } from './format-complete-task-result'
import { resolvePRDetails } from './resolve-pr-details'

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

runWorkflow<CompleteTaskContext>(
  [verifyBuild, codeReview, submitPR, fetchPRFeedback],
  buildCompleteTaskContext,
  (result: WorkflowResult, ctx: CompleteTaskContext) => formatCompleteTaskResult(result, ctx),
)

async function buildCompleteTaskContext(): Promise<CompleteTaskContext> {
  const branch = await git.currentBranch()
  const reviewDir = `reviews/${branch}`

  await mkdir(reviewDir, { recursive: true })

  const issueNumber = parseIssueNumber(branch)
  const taskDetails = issueNumber ? await github.getIssue(issueNumber) : undefined
  const prDetails = resolvePRDetails(issueNumber, taskDetails)
  const existingPrNumber = await github.findPRForBranch(branch)

  return {
    branch,
    reviewDir,
    hasIssue: prDetails.hasIssue,
    issueNumber: prDetails.issueNumber,
    taskDetails: prDetails.taskDetails,
    commitMessage: prDetails.commitMessage,
    prTitle: prDetails.prTitle,
    prBody: prDetails.prBody,
    prNumber: existingPrNumber,
  }
}
