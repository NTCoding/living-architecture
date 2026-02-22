import { mkdir } from 'node:fs/promises'
import { git } from '../../../platform/infra/external-clients/git-client'
import { github } from '../../../platform/infra/external-clients/github-rest-client'
import { ghCli } from '../../../platform/infra/external-clients/gh-cli'
import { cli } from '../../../platform/infra/external-clients/cli-args'
import { claude } from '../../../platform/infra/external-clients/claude-agent'
import { nx } from '../../../platform/infra/external-clients/nx-runner'
import { fetchRawPRFeedback } from '../../../platform/infra/external-clients/github-graphql-client'
import { parseIssueNumber } from '../../../platform/domain/branch-naming/issue-branch-parser'
import { runWorkflow } from '../../../platform/infra/workflow-execution/run-workflow'
import type { WorkflowResult } from '../../../platform/domain/workflow-execution/workflow-runner'
import { createDebugLog } from '../../../platform/infra/logging/debug-log'
import { createDefaultWorkflowIO } from '../../../platform/infra/external-clients/workflow-io'
import type { CompleteTaskContext } from '../domain/task-to-complete'
import { formatCompleteTaskResult } from '../domain/pipeline-outcome'
import {
  resolveSkipReview,
  type CliReader,
  parsePRMode,
  parseNumberArg,
  validateCreateMode,
  validateUpdateMode,
  buildReviewDir,
} from '../domain/complete-task-cli-parser'
import { resolvePRDetails } from '../domain/pull-request-draft'
import {
  buildSteps, resolveTimingsFilePath, resolveOutputFilePath 
} from '../domain/workflow-setup'

export {
  resolveTimingsFilePath, resolveOutputFilePath 
} from '../domain/workflow-setup'

interface ContextDeps {
  currentBranch: () => Promise<string>
  getIssue: (issueNumber: number) => Promise<{
    title: string
    body: string
  }>
  findPRForBranch: (branch: string) => Promise<number | undefined>
  parseIssueNumber: (branch: string) => number | undefined
  cliReader: CliReader
  parseOptionalArg: (name: string) => string | undefined
  createDirectory: (path: string) => Promise<void>
}

async function buildCompleteTaskContext(deps: ContextDeps): Promise<CompleteTaskContext> {
  const branch = await deps.currentBranch()
  const reviewDir = buildReviewDir(branch)
  const prMode = parsePRMode(deps.cliReader)

  await deps.createDirectory(reviewDir)

  const issueNumber = deps.parseIssueNumber(branch)
  const taskDetails = issueNumber ? await deps.getIssue(issueNumber) : undefined
  const existingPrNumber = await deps.findPRForBranch(branch)

  if (prMode === 'create') {
    validateCreateMode(existingPrNumber)
    const cliArgs = {
      prTitle: deps.parseOptionalArg('--pr-title'),
      prBody: deps.parseOptionalArg('--pr-body'),
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

  const feedbackItemsResolved = parseNumberArg(deps.cliReader, '--feedback-items-resolved')
  const feedbackItemsRemaining = parseNumberArg(deps.cliReader, '--feedback-items-remaining')
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

export function executeCompleteTask(): void {
  const debugLog = createDebugLog('reviews/debug.log')
  debugLog.log('executeCompleteTask: starting')

  const contextDeps: ContextDeps = {
    currentBranch: git.currentBranch.bind(git),
    getIssue: github.getIssue.bind(github),
    findPRForBranch: github.findPRForBranch.bind(github),
    parseIssueNumber,
    cliReader: cli,
    parseOptionalArg: cli.parseArg.bind(cli),
    createDirectory: (path: string) => mkdir(path, { recursive: true }).then(() => undefined),
  }

  const stepDeps = {
    verifyBuild: { runMany: nx.runMany.bind(nx) },
    codeReview: {
      skipReview: resolveSkipReview(cli),
      baseBranch: git.baseBranch.bind(git),
      unpushedFiles: git.unpushedFilesWithStatus.bind(git),
      queryAgentText: claude.queryText.bind(claude),
      debugLog,
    },
    submitPR: {
      uncommittedFiles: git.uncommittedFiles.bind(git),
      push: git.push.bind(git),
      baseBranch: git.baseBranch.bind(git),
      getPR: github.getPR.bind(github),
      createPR: github.createPR.bind(github),
      watchCI: ghCli.watchCI.bind(ghCli),
    },
    fetchPRFeedback: { fetchRawPRFeedback },
  }

  runWorkflow<CompleteTaskContext>(
    buildSteps(stepDeps),
    () => buildCompleteTaskContext(contextDeps),
    (result: WorkflowResult, ctx: CompleteTaskContext) => formatCompleteTaskResult(result, ctx),
    {
      resolveTimingsFilePath,
      resolveOutputFilePath,
      errorOutputFilePath: 'reviews/error-output.json',
      debugLog,
      io: createDefaultWorkflowIO(),
    },
  )
}
