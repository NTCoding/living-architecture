#!/usr/bin/env tsx
import { mkdir } from 'node:fs/promises'
import {
  workflow, type WorkflowContext 
} from '../workflow-runner/workflow-runner'
import { git } from '../external-clients/git'
import { github } from '../external-clients/github'
import { WorkflowError } from '../errors'
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

function parseCliArg(flag: string): string | undefined {
  const index = process.argv.indexOf(flag)
  if (index === -1 || index + 1 >= process.argv.length) {
    return undefined
  }
  return process.argv[index + 1]
}

interface TaskDetails {
  title: string
  body: string
}

interface PRDetails {
  prTitle: string
  prBody: string
  commitMessage: string
  hasIssue: boolean
  issueNumber?: number
  taskDetails?: TaskDetails
}

function formatCommitMessage(title: string): string {
  return `${title}\n\nCo-Authored-By: Claude <noreply@anthropic.com>`
}

function resolvePRDetails(
  branch: string,
  issueNumber: number | undefined,
  taskDetails: TaskDetails | undefined,
  cliPrTitle: string | undefined,
  cliPrBody: string | undefined,
  cliCommitMessage: string | undefined,
): PRDetails {
  if (issueNumber && taskDetails) {
    return {
      prTitle: taskDetails.title,
      prBody: taskDetails.body,
      commitMessage: formatCommitMessage(taskDetails.title),
      hasIssue: true,
      issueNumber,
      taskDetails,
    }
  }

  if (cliPrTitle && cliPrBody && cliCommitMessage) {
    return {
      prTitle: cliPrTitle,
      prBody: cliPrBody,
      commitMessage: formatCommitMessage(cliCommitMessage),
      hasIssue: false,
    }
  }

  throw new WorkflowError(
    `Branch "${branch}" is not an issue branch (pattern: issue-<number>).\n` +
      'For non-issue branches, provide ALL of:\n' +
      '  --pr-title "Your PR title"\n' +
      '  --pr-body "Your PR description"\n' +
      '  --commit-message "Your commit message"',
  )
}

async function main(): Promise<void> {
  const branch = await git.currentBranch()
  const reviewDir = `reviews/${branch}`

  await mkdir(reviewDir, { recursive: true })

  const issueNumber = parseIssueNumberFromBranch(branch)
  const taskDetails = issueNumber ? await github.getIssue(issueNumber) : undefined

  const cliPrTitle = parseCliArg('--pr-title')
  const cliPrBody = parseCliArg('--pr-body')
  const cliCommitMessage = parseCliArg('--commit-message')

  const prDetails = resolvePRDetails(
    branch,
    issueNumber,
    taskDetails,
    cliPrTitle,
    cliPrBody,
    cliCommitMessage,
  )
  const existingPrNumber = await github.findPRForBranch(branch)

  const context: WorkflowContext = {
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
