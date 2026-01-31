import { mkdir } from 'node:fs/promises'
import { git } from '../../../platform/infra/external-clients/git-client'
import { github } from '../../../platform/infra/external-clients/github-rest-client'
import { ghCli } from '../../../platform/infra/external-clients/gh-cli'
import { cli } from '../../../platform/infra/external-clients/cli-args'
import { claude } from '../../../platform/infra/external-clients/claude-agent'
import { nx } from '../../../platform/infra/external-clients/nx-runner'
import { fetchRawPRFeedback } from '../../../platform/infra/external-clients/github-graphql-client'
import { parseIssueNumber } from '../../../platform/domain/branch-naming/issue-branch-parser'
import { runWorkflow } from '../../../platform/domain/workflow-execution/run-workflow'
import {
  WorkflowError,
  type WorkflowResult,
} from '../../../platform/domain/workflow-execution/workflow-runner'
import type {
  CompleteTaskContext, PRMode 
} from '../domain/task-to-complete'
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

function parsePRMode(): PRMode {
  const raw = cli.requireArg('--prmode')
  if (raw !== 'create' && raw !== 'update') {
    throw new WorkflowError(`--prmode must be 'create' or 'update', got '${raw}'`)
  }
  return raw
}

function parseNumberArg(flag: string): number {
  const raw = cli.requireArg(flag)
  const parsed = Number(raw)
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new WorkflowError(`${flag} must be a non-negative integer, got '${raw}'`)
  }
  return parsed
}

function validateCreateMode(existingPrNumber: number | undefined): void {
  if (existingPrNumber !== undefined) {
    throw new WorkflowError(
      `PR #${existingPrNumber} already exists for this branch. Use --prmode update instead.`,
    )
  }
}

function validateUpdateMode(
  existingPrNumber: number | undefined,
  feedbackItemsRemaining: number,
): void {
  if (existingPrNumber === undefined) {
    throw new WorkflowError('No PR exists for this branch. Use --prmode create instead.')
  }
  if (feedbackItemsRemaining > 0) {
    throw new WorkflowError(
      `${feedbackItemsRemaining} feedback items remaining. ` +
        'Fix ALL feedback items before re-submitting to avoid expensive round-trip costs (10min CI + review cycle).',
    )
  }
}

async function buildCompleteTaskContext(): Promise<CompleteTaskContext> {
  const branch = await git.currentBranch()
  const reviewDir = buildReviewDir(branch)
  const prMode = parsePRMode()

  await mkdir(reviewDir, { recursive: true })

  const issueNumber = parseIssueNumber(branch)
  const taskDetails = issueNumber ? await github.getIssue(issueNumber) : undefined
  const existingPrNumber = await github.findPRForBranch(branch)

  if (prMode === 'create') {
    validateCreateMode(existingPrNumber)
    const cliArgs = {
      prTitle: cli.parseArg('--pr-title'),
      prBody: cli.parseArg('--pr-body'),
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

  const feedbackItemsResolved = parseNumberArg('--feedback-items-resolved')
  const feedbackItemsRemaining = parseNumberArg('--feedback-items-remaining')
  validateUpdateMode(existingPrNumber, feedbackItemsRemaining)

  const cliArgs = {
    prTitle: cli.parseArg('--pr-title'),
    prBody: cli.parseArg('--pr-body'),
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
    feedbackItemsResolved,
    feedbackItemsRemaining,
  }
}

export { completeTaskContextSchema } from '../domain/task-to-complete'
export type { CompleteTaskContext } from '../domain/task-to-complete'
export type { CompleteTaskResult } from '../domain/pipeline-outcome'
export { MissingPullRequestDetailsError } from '../domain/pull-request-draft'
export { AgentError } from '../domain/steps/run-code-review'

function resolveSkipReview(): boolean {
  const hasFlag = cli.hasFlag('--reject-review-feedback')
  if (hasFlag && cli.parseArg('--prmode') !== 'update') {
    throw new WorkflowError('--reject-review-feedback can only be used with --prmode update')
  }
  return hasFlag
}

function buildSteps() {
  return [
    createVerifyBuildStep({ runMany: nx.runMany.bind(nx) }),
    createCodeReviewStep({
      skipReview: resolveSkipReview(),
      baseBranch: git.baseBranch.bind(git),
      unpushedFiles: git.unpushedFiles.bind(git),
      queryAgentText: claude.queryText.bind(claude),
    }),
    createSubmitPRStep({
      uncommittedFiles: git.uncommittedFiles.bind(git),
      push: git.push.bind(git),
      baseBranch: git.baseBranch.bind(git),
      getPR: github.getPR.bind(github),
      createPR: github.createPR.bind(github),
      watchCI: ghCli.watchCI.bind(ghCli),
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
