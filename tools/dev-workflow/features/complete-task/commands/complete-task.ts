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
import { createDebugLog } from '../../../platform/infra/logging/debug-log'
import { createDefaultWorkflowIO } from '../../../platform/infra/external-clients/workflow-io'
import type { CompleteTaskContext } from '../domain/task-to-complete'
import { formatCompleteTaskResult } from '../domain/pipeline-outcome'
import { resolveSkipReview } from '../domain/complete-task-cli-parser'
import {
  buildCompleteTaskContext,
  buildSteps,
  resolveTimingsFilePath,
} from '../domain/workflow-setup'

export { resolveTimingsFilePath } from '../domain/workflow-setup'

export function executeCompleteTask(): void {
  const debugLog = createDebugLog('reviews/debug.log')
  debugLog.log('executeCompleteTask: starting')

  const contextDeps = {
    currentBranch: git.currentBranch.bind(git),
    getIssue: github.getIssue.bind(github),
    findPRForBranch: github.findPRForBranch.bind(github),
    parseIssueNumber,
    cliReader: cli,
    parseOptionalArg: cli.parseArg.bind(cli),
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
      debugLog,
      io: createDefaultWorkflowIO(),
    },
  )
}
