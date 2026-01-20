import { mkdir } from 'node:fs/promises'
import { git } from '../../../platform/infra/external-clients/git-client'
import { github } from '../../../platform/infra/external-clients/github-rest-client'
import { parseIssueNumber } from '../../../platform/domain/branch-naming/issue-branch-parser'
import { type CompleteTaskContext } from '../domain/task-to-complete'
import { resolvePRDetails } from '../domain/pull-request-draft'

export async function buildCompleteTaskContext(): Promise<CompleteTaskContext> {
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
