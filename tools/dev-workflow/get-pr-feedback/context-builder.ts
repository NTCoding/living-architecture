import { git } from '../external-clients/git'
import { github } from '../external-clients/github'
import type { WorkflowContext } from '../workflow-runner/workflow-runner'

export async function buildGetPRFeedbackContext(): Promise<WorkflowContext> {
  const branch = await git.currentBranch()
  const prNumber = await github.findPRForBranch(branch)

  return {
    branch,
    prNumber: prNumber ?? undefined,
  }
}
