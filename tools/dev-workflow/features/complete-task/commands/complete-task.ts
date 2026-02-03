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
import type { WorkflowResult } from '../../../platform/domain/workflow-execution/workflow-runner'
import { createDebugLog } from '../../../platform/infra/debug-log'
import type { CompleteTaskContext } from '../domain/task-to-complete'
import { resolvePRDetails } from '../domain/pull-request-draft'
import { formatCompleteTaskResult } from '../domain/pipeline-outcome'
import { createVerifyBuildStep } from '../domain/steps/verify-build'
import { createCodeReviewStep } from '../domain/steps/run-code-review'
import { createSubmitPRStep } from '../domain/steps/submit-pull-request'
import { createFetchPRFeedbackStep } from '../domain/steps/fetch-feedback'
import {
  parsePRMode,
  parseNumberArg,
  validateCreateMode,
  validateUpdateMode,
  buildReviewDir,
  resolveSkipReview,
} from '../domain/complete-task-cli-parser'

export { completeTaskContextSchema } from '../domain/task-to-complete'
export type { CompleteTaskContext } from '../domain/task-to-complete'
export type { CompleteTaskResult } from '../domain/pipeline-outcome'
export { MissingPullRequestDetailsError } from '../domain/pull-request-draft'
export { AgentError } from '../domain/steps/run-code-review'

async function buildCompleteTaskContext(): Promise<CompleteTaskContext> {
  const branch = await git.currentBranch()
  const reviewDir = buildReviewDir(branch)
  const prMode = parsePRMode(cli)

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

  const feedbackItemsResolved = parseNumberArg(cli, '--feedback-items-resolved')
  const feedbackItemsRemaining = parseNumberArg(cli, '--feedback-items-remaining')
  validateUpdateMode(existingPrNumber, feedbackItemsRemaining)

  return {
    branch,
    reviewDir,
    prMode,
    hasIssue: Boolean(issueNumber),
    issueNumber,
    taskDetails,
    prNumber: existingPrNumber,
    feedbackItemsResolved,
    feedbackItemsRemaining,
  }
}

function buildSteps(debugLog: ReturnType<typeof createDebugLog>) {
  return [
    createVerifyBuildStep({ runMany: nx.runMany.bind(nx) }),
    createCodeReviewStep({
      skipReview: resolveSkipReview(cli),
      baseBranch: git.baseBranch.bind(git),
      unpushedFiles: git.unpushedFiles.bind(git),
      queryAgentText: claude.queryText.bind(claude),
      debugLog,
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
  const debugLog = createDebugLog('reviews/debug.log')
  debugLog.log('executeCompleteTask: starting')

  runWorkflow<CompleteTaskContext>(
    buildSteps(debugLog),
    buildCompleteTaskContext,
    (result: WorkflowResult, ctx: CompleteTaskContext) => formatCompleteTaskResult(result, ctx),
    {
      resolveTimingsFilePath,
      debugLog,
    },
  )
}
