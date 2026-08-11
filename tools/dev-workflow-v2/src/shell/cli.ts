import { createDefaultProcessDeps } from '@nt-ai-lab/deterministic-agent-workflow-cli'
import { createClaudeCodeWorkflowCli } from '@nt-ai-lab/deterministic-agent-workflow-claude-code'
import { WORKFLOW_DEFINITION } from '../features/workflow/data-access/workflow-definition'
import {
  ROUTES, PRE_TOOL_USE_POLICY 
} from '../features/workflow/entrypoint/workflow/entrypoint'
import { createWorkflowGitStatusReader } from '../features/workflow/adapters/git/workflow-git-status-reader'
import { createWorkflowPullRequestCreator } from '../features/workflow/adapters/github/workflow-pull-request-creator'
import { createWorkflowPullRequestFeedbackReader } from '../features/workflow/adapters/github/workflow-pull-request-feedback-reader'
import { readGitRepositoryStatus } from '../platform/infra/external-clients/git/index'
import {
  createGithubPullRequestClient,
  createGithubPullRequestFeedbackClient,
  runGh,
} from '../platform/infra/external-clients/github/index'

/**
 * Performs an intentionally synchronous sleep for CLI polling.
 * Do not use this from async or request-serving contexts.
 */
function sleepMs(ms: number): void {
  if (!Number.isFinite(ms) || ms < 0) {
    throw new TypeError('sleepMs requires a finite non-negative number')
  }

  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
}

/** @riviere-role main */
// WorkflowCliConfig drops TStateName/TOperation (defaults to string).
// Safe — StateName ⊂ string, WorkflowOperation ⊂ string.
createClaudeCodeWorkflowCli({
  // @ts-expect-error WorkflowCliConfig widens StateName/WorkflowOperation to string
  workflowDefinition: WORKFLOW_DEFINITION,
  routes: ROUTES,
  bashForbidden: PRE_TOOL_USE_POLICY.bashForbidden,
  isWriteAllowed: PRE_TOOL_USE_POLICY.isWriteAllowed,
  processDeps: createDefaultProcessDeps(),
  buildWorkflowDeps: (platform) => ({
    getGitInfo: createWorkflowGitStatusReader(readGitRepositoryStatus),
    getPrFeedback: createWorkflowPullRequestFeedbackReader(
      createGithubPullRequestFeedbackClient(runGh),
    ),
    createPullRequest: createWorkflowPullRequestCreator(createGithubPullRequestClient(runGh)),
    listSessionReviews: () => platform.store.listSessionReviews(platform.getSessionId()),
    sleepMs,
    now: platform.now,
  }),
})
