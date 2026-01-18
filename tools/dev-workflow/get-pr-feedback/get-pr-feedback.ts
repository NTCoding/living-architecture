#!/usr/bin/env bun
import { z } from 'zod'
import { runWorkflow } from '../workflow-runner/run-workflow'
import { baseContextSchema } from '../workflow-runner/workflow-runner'
import { git } from '../external-clients/git'
import { github } from '../external-clients/github'
import { cli } from '../external-clients/cli'
import { fetchFeedback } from './steps/fetch-feedback'

const prStateSchema = z.enum(['merged', 'open', 'closed'])

export const getPRFeedbackContextSchema = baseContextSchema.extend({
  prNumber: z.number().optional(),
  prUrl: z.string().optional(),
  prState: prStateSchema.optional(),
  includeResolved: z.boolean(),
})
export type GetPRFeedbackContext = z.infer<typeof getPRFeedbackContextSchema>

runWorkflow<GetPRFeedbackContext>([fetchFeedback], buildGetPRFeedbackContext)

async function buildGetPRFeedbackContext(): Promise<GetPRFeedbackContext> {
  const branch = await git.currentBranch()
  const includeResolved = cli.hasFlag('--include-resolved')
  const prNumberArg = cli.parseArg('--pr')

  if (prNumberArg) {
    const prNumber = parseInt(prNumberArg, 10)
    const prInfo = await github.getPRWithState(prNumber)
    return {
      branch,
      prNumber: prInfo.number,
      prUrl: prInfo.url,
      prState: prInfo.state,
      includeResolved,
    }
  }

  const prInfo = await github.findPRForBranchWithState(branch)
  return {
    branch,
    prNumber: prInfo?.number,
    prUrl: prInfo?.url,
    prState: prInfo?.state,
    includeResolved,
  }
}
