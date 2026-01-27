import { mkdir } from 'node:fs/promises'
import { git } from '../../../platform/infra/external-clients/git-client'
import { github } from '../../../platform/infra/external-clients/github-rest-client'
import { parseIssueNumber } from '../../../platform/domain/branch-naming/issue-branch-parser'
import { runWorkflow } from '../../../platform/domain/workflow-execution/run-workflow'
import type { WorkflowResult } from '../../../platform/domain/workflow-execution/workflow-runner'
import { type CompleteTaskContext } from '../domain/task-to-complete'
import { resolvePRDetails } from '../domain/pull-request-draft'
import { formatCompleteTaskResult } from '../domain/pipeline-outcome'
import { verifyBuild } from '../domain/steps/verify-build'
import { codeReview } from '../domain/steps/run-code-review'
import { submitPR } from '../domain/steps/submit-pull-request'
import { fetchPRFeedback } from '../domain/steps/fetch-feedback'

function sanitizeBranchNameForPath(branch: string): string {
  return branch.replaceAll(/[^a-zA-Z0-9_-]/g, '_')
}

async function buildCompleteTaskContext(): Promise<CompleteTaskContext> {
  const branch = await git.currentBranch()
  const safeBranch = sanitizeBranchNameForPath(branch)
  const reviewDir = `reviews/${safeBranch}`

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

const COMPLETE_TASK_STEPS = [verifyBuild, codeReview, submitPR, fetchPRFeedback]

export function executeCompleteTask(): void {
  runWorkflow<CompleteTaskContext>(
    COMPLETE_TASK_STEPS,
    buildCompleteTaskContext,
    (result: WorkflowResult, ctx: CompleteTaskContext) => formatCompleteTaskResult(result, ctx),
  )
}
