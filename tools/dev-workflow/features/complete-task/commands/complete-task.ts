import { mkdir } from 'node:fs/promises'
import { git } from '../../../platform/infra/external-clients/git-client'
import { github } from '../../../platform/infra/external-clients/github-rest-client'
import { cli } from '../../../platform/infra/external-clients/cli-args'
import { claude } from '../../../platform/infra/external-clients/claude-agent'
import { nx } from '../../../platform/infra/external-clients/nx-runner'
import { fetchRawPRFeedback } from '../../../platform/infra/external-clients/github-graphql-client'
import { parseIssueNumber } from '../../../platform/domain/branch-naming/issue-branch-parser'
import { runWorkflow } from '../../../platform/domain/workflow-execution/run-workflow'
import type { WorkflowResult } from '../../../platform/domain/workflow-execution/workflow-runner'
import { type CompleteTaskContext } from '../domain/task-to-complete'
import { resolvePRDetails } from '../domain/pull-request-draft'
import { formatCompleteTaskResult } from '../domain/pipeline-outcome'
import { createVerifyBuildStep } from '../domain/steps/verify-build'
import { createCodeReviewStep } from '../domain/steps/run-code-review'
import { createSubmitPRStep } from '../domain/steps/submit-pull-request'
import { createFetchPRFeedbackStep } from '../domain/steps/fetch-feedback'

function sanitizeBranchNameForPath(branch: string): string {
  return branch.replaceAll(/[^a-zA-Z0-9_-]/g, '_')
}

function buildReviewDir(branch: string): string {
  const safeBranch = sanitizeBranchNameForPath(branch)
  return `reviews/${safeBranch}`
}

async function buildCompleteTaskContext(): Promise<CompleteTaskContext> {
  const branch = await git.currentBranch()
  const reviewDir = buildReviewDir(branch)

  await mkdir(reviewDir, { recursive: true })

  const issueNumber = parseIssueNumber(branch)
  const taskDetails = issueNumber ? await github.getIssue(issueNumber) : undefined
  const cliArgs = {
    prTitle: cli.parseArg('--pr-title'),
    prBody: cli.parseArg('--pr-body'),
    commitMessage: cli.parseArg('--commit-message'),
  }
  const prDetails = resolvePRDetails(cliArgs, issueNumber, taskDetails)
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

export { completeTaskContextSchema } from '../domain/task-to-complete'
export type { CompleteTaskContext } from '../domain/task-to-complete'
export type { CompleteTaskResult } from '../domain/pipeline-outcome'
export { MissingPullRequestDetailsError } from '../domain/pull-request-draft'
export { AgentError } from '../domain/steps/run-code-review'

function buildSteps() {
  return [
    createVerifyBuildStep({ runMany: nx.runMany.bind(nx) }),
    createCodeReviewStep({
      skipReview: cli.hasFlag('--reject-review-feedback'),
      baseBranch: git.baseBranch.bind(git),
      unpushedFiles: git.unpushedFiles.bind(git),
      queryAgentText: claude.queryText.bind(claude),
    }),
    createSubmitPRStep({
      uncommittedFiles: git.uncommittedFiles.bind(git),
      stageAll: git.stageAll.bind(git),
      commit: git.commit.bind(git),
      push: git.push.bind(git),
      headSha: git.headSha.bind(git),
      baseBranch: git.baseBranch.bind(git),
      getPR: github.getPR.bind(github),
      createPR: github.createPR.bind(github),
      watchCI: github.watchCI.bind(github),
    }),
    createFetchPRFeedbackStep({ fetchRawPRFeedback }),
  ]
}

export function resolveTimingsFilePath(ctx: CompleteTaskContext): string {
  return `${ctx.reviewDir}/timings.md`
}

export function executeCompleteTask(): void {
  runWorkflow<CompleteTaskContext>(
    buildSteps(),
    buildCompleteTaskContext,
    (result: WorkflowResult, ctx: CompleteTaskContext) => formatCompleteTaskResult(result, ctx),
    { resolveTimingsFilePath },
  )
}
