#!/usr/bin/env tsx
import { mkdir } from 'node:fs/promises'
import {
  workflow, type WorkflowContext 
} from '../workflow-runner/workflow-runner'
import { git } from '../external-clients/git'
import { github } from '../external-clients/github'
import { verifyBuild } from './steps/verify-build'
import { codeReview } from './steps/code-review'
import { submitPR } from './steps/submit-pr'
import { fetchPRFeedback } from './steps/fetch-pr-feedback'

const rejectReviewFeedback = process.argv.includes('--reject-review-feedback')

const steps = rejectReviewFeedback
  ? [verifyBuild, submitPR, fetchPRFeedback]
  : [verifyBuild, codeReview, submitPR, fetchPRFeedback]

const completeTask = workflow(steps)

const issuePattern = /issue-(\d+)/

function parseIssueNumberFromBranch(branch: string): number | undefined {
  const match = issuePattern.exec(branch)
  return match ? parseInt(match[1], 10) : undefined
}

async function main(): Promise<void> {
  const branch = await git.currentBranch()
  const reviewDir = `reviews/${branch}`

  await mkdir(reviewDir, { recursive: true })

  const issueNumber = parseIssueNumberFromBranch(branch)
  const taskDetails = issueNumber ? await github.getIssue(issueNumber) : undefined

  const context: WorkflowContext = {
    branch,
    reviewDir,
    hasIssue: issueNumber !== undefined,
    issueNumber,
    taskDetails,
    commitMessage: `feat: implement changes\n\nCo-Authored-By: Claude <noreply@anthropic.com>`,
    prTitle: taskDetails?.title ?? `feat(${branch}): changes`,
    prBody: taskDetails?.body ?? 'Automated PR submission.',
  }

  const result = await completeTask(context)

  console.log(JSON.stringify(result, null, 2))
  process.exit(result.success ? 0 : 1)
}

main().catch((error: unknown) => {
  console.error(
    JSON.stringify(
      {
        success: false,
        nextAction: 'fix_errors',
        nextInstructions: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
      },
      null,
      2,
    ),
  )
  process.exit(1)
})
