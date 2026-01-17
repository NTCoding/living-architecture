#!/usr/bin/env tsx
import { z } from 'zod'
import { runWorkflow } from '../workflow-runner/run-workflow'
import { baseContextSchema } from '../workflow-runner/workflow-runner'
import { git } from '../external-clients/git'
import { github } from '../external-clients/github'
import { fetchFeedback } from './steps/fetch-feedback'

export const getPRFeedbackContextSchema = baseContextSchema.extend({prNumber: z.number().optional(),})
export type GetPRFeedbackContext = z.infer<typeof getPRFeedbackContextSchema>

runWorkflow<GetPRFeedbackContext>([fetchFeedback], buildGetPRFeedbackContext)

async function buildGetPRFeedbackContext(): Promise<GetPRFeedbackContext> {
  const branch = await git.currentBranch()
  const prNumber = await github.findPRForBranch(branch)
  return {
    branch,
    prNumber,
  }
}
