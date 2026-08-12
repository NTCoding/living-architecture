import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createDefaultProcessDeps } from '@nt-ai-lab/deterministic-agent-workflow-cli'
import { createCodexWorkflowCli } from '@nt-ai-lab/deterministic-agent-workflow-codex'
import { WORKFLOW_DEFINITION } from '../features/workflow/data-access/workflow-definition'
import { ROUTES, PRE_TOOL_USE_POLICY } from '../features/workflow/entrypoint/workflow/entrypoint'
import { createWorkflowGitStatusReader } from '../features/workflow/adapters/git/workflow-git-status-reader'
import { createWorkflowPullRequestCreator } from '../features/workflow/adapters/github/workflow-pull-request-creator'
import { createWorkflowPullRequestFeedbackReader } from '../features/workflow/adapters/github/workflow-pull-request-feedback-reader'
import { readGitRepositoryStatus } from '../platform/infra/external-clients/git/index'
import {
  createGithubPullRequestClient,
  createGithubPullRequestFeedbackClient,
  runGh,
} from '../platform/infra/external-clients/github/index'

const workflowRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const workflowCommand =
  'npx tsx "$(git rev-parse --show-toplevel)/tools/dev-workflow-v2/src/shell/codex-workflow-command.ts"'
const defaultProcessDeps = createDefaultProcessDeps()
const processDeps = {
  ...defaultProcessDeps,
  readFile: (path: string) => {
    const input = defaultProcessDeps.readFile(path)
    const threadId = defaultProcessDeps.getEnv('CODEX_THREAD_ID')

    if (path !== '/dev/stdin' || threadId === undefined || threadId === '') {
      return input
    }

    const hookInput: unknown = JSON.parse(input)
    if (typeof hookInput !== 'object' || hookInput === null || Array.isArray(hookInput)) {
      return input
    }

    return JSON.stringify({
      ...hookInput,
      session_id: threadId,
    })
  },
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
createCodexWorkflowCli({
  workflowDefinition: WORKFLOW_DEFINITION,
  routes: ROUTES,
  bashForbidden: PRE_TOOL_USE_POLICY.bashForbidden,
  isWriteAllowed: PRE_TOOL_USE_POLICY.isWriteAllowed,
  workflowCommand,
  workflowRoot,
  processDeps,
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
