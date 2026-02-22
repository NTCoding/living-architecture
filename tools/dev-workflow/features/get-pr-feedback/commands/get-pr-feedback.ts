import { git } from '../../../platform/infra/external-clients/git-client'
import { github } from '../../../platform/infra/external-clients/github-rest-client'
import { cli } from '../../../platform/infra/external-clients/cli-args'
import { fetchRawPRFeedback } from '../../../platform/infra/external-clients/github-graphql-client'
import { runWorkflow } from '../../../platform/infra/workflow-execution/run-workflow'
import type { GetPRFeedbackContext } from '../domain/feedback-report'
import { createFetchFeedbackStep } from '../domain/steps/fetch-feedback'

async function buildGetPRFeedbackContext(): Promise<GetPRFeedbackContext> {
  const branch = await git.currentBranch()
  const includeResolved = cli.hasFlag('--include-resolved')
  const prNumberArg = cli.parseArg('--pr')

  if (prNumberArg) {
    const prNumber = parseInt(prNumberArg, 10)
    if (Number.isNaN(prNumber)) {
      throw new TypeError(`Invalid --pr argument: "${prNumberArg}" is not a valid PR number`)
    }
    const prInfo = await github.getPRWithState(prNumber)
    return {
      branch,
      prNumber: prInfo.number,
      prUrl: prInfo.url,
      prState: prInfo.state,
      includeResolved,
    }
  }

  const prInfo = await github.findPRForBranchWithState(branch)
  return {
    branch,
    prNumber: prInfo?.number,
    prUrl: prInfo?.url,
    prState: prInfo?.state,
    includeResolved,
  }
}

export function executeGetPRFeedback(): void {
  const fetchFeedback = createFetchFeedbackStep({
    getPRMergeInfo: github.getPRMergeInfo.bind(github),
    listCheckRuns: github.listCheckRuns.bind(github),
    fetchRawPRFeedback,
  })
  runWorkflow<GetPRFeedbackContext>([fetchFeedback], buildGetPRFeedbackContext)
}
