import { createDefaultProcessDeps } from '@nt-ai-lab/deterministic-agent-workflow-cli'
import { createClaudeCodeWorkflowCli } from '@nt-ai-lab/deterministic-agent-workflow-claude-code'
import { createWorkflowGitStatusReader } from '@living-architecture/dev-workflow-v2-use-cases/adapters/git/workflow-git-status-reader'
import { createWorkflowPullRequestCreator } from '@living-architecture/dev-workflow-v2-use-cases/adapters/github/workflow-pull-request-creator'
import { createWorkflowPullRequestFeedbackReader } from '@living-architecture/dev-workflow-v2-use-cases/adapters/github/workflow-pull-request-feedback-reader'
import { configureWorkflow } from '@living-architecture/dev-workflow-v2-use-cases/commands/configure-workflow'
import { readGitRepositoryStatus } from '@living-architecture/dev-workflow-v2-use-cases/external-clients/git/git-client'
import { createGithubPullRequestClient } from '@living-architecture/dev-workflow-v2-use-cases/external-clients/github/create-pull-request'
import { createGithubPullRequestFeedbackClient } from '@living-architecture/dev-workflow-v2-use-cases/external-clients/github/get-pr-feedback'
import { runGh } from '@living-architecture/dev-workflow-v2-use-cases/external-clients/github/github-cli'
import { createWorkflowRoutes } from '../features/workflow/entrypoint/workflow/entrypoint'

const workflowConfiguration = configureWorkflow({})
const workflowDefinition = workflowConfiguration
const routes = createWorkflowRoutes(workflowDefinition.stateSchema)
const bashForbidden = {
  commands: ['git push', 'gh pr'],
  flags: ['--no-verify', '--force', '--hard'],
}

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
createClaudeCodeWorkflowCli({
  // @ts-expect-error ClaudeCodeWorkflowCliConfig widens StateName and WorkflowOperation to string.
  workflowDefinition,
  routes,
  bashForbidden,
  isWriteAllowed: workflowConfiguration.isWriteAllowed,
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
