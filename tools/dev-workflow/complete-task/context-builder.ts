import { mkdir } from 'node:fs/promises'
import { git } from '../external-clients/git'
import { github } from '../external-clients/github'
import { cli } from '../external-clients/cli'
import { WorkflowError } from '../errors'
import type { WorkflowContext } from '../workflow-runner/workflow-runner'

const ISSUE_BRANCH_PATTERN = /issue-(\d+)/

export function shouldSkipCodeReview(): boolean {
  return cli.hasFlag('--reject-review-feedback')
}

function parseIssueNumberFromBranch(branch: string): number | undefined {
  const match = ISSUE_BRANCH_PATTERN.exec(branch)
  return match ? parseInt(match[1], 10) : undefined
}

function formatCommitMessage(title: string): string {
  return `${title}\n\nCo-Authored-By: Claude <noreply@anthropic.com>`
}

interface PRDetails {
  prTitle: string
  prBody: string
  commitMessage: string
  hasIssue: boolean
  issueNumber?: number
  taskDetails?: {
    title: string
    body: string
  }
}

interface TaskDetails {
  title: string
  body: string
}

function resolvePRDetails(
  branch: string,
  issueNumber: number | undefined,
  taskDetails: TaskDetails | undefined,
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

  const cliPrTitle = cli.parseArg('--pr-title')
  const cliPrBody = cli.parseArg('--pr-body')
  const cliCommitMessage = cli.parseArg('--commit-message')

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

export async function buildWorkflowContext(): Promise<WorkflowContext> {
  const branch = await git.currentBranch()
  const reviewDir = `reviews/${branch}`

  await mkdir(reviewDir, { recursive: true })

  const issueNumber = parseIssueNumberFromBranch(branch)
  const taskDetails = issueNumber ? await github.getIssue(issueNumber) : undefined
  const prDetails = resolvePRDetails(branch, issueNumber, taskDetails)
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
