import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createDefaultProcessDeps } from '@nt-ai-lab/deterministic-agent-workflow-cli'
import { defineWorkflowRoutes } from '@living-architecture/dev-workflow-v2-use-cases/external-clients/deterministic-agent-workflow-cli/define-workflow-routes'
import { createCodexWorkflowCli } from '@nt-ai-lab/deterministic-agent-workflow-codex'
import { createWorkflowGitStatusReader } from '@living-architecture/dev-workflow-v2-use-cases/adapters/git/workflow-git-status-reader'
import { createWorkflowPullRequestCreator } from '@living-architecture/dev-workflow-v2-use-cases/adapters/github/workflow-pull-request-creator'
import { createWorkflowPullRequestFeedbackReader } from '@living-architecture/dev-workflow-v2-use-cases/adapters/github/workflow-pull-request-feedback-reader'
import { configureWorkflow } from '@living-architecture/dev-workflow-v2-use-cases/commands/configure-workflow'
import { CreateWorkflowRoutes } from '@living-architecture/dev-workflow-v2-use-cases/commands/create-workflow-routes'
import { readGitRepositoryStatus } from '@living-architecture/dev-workflow-v2-use-cases/external-clients/git/git-client'
import { createGithubPullRequestClient } from '@living-architecture/dev-workflow-v2-use-cases/external-clients/github/create-pull-request'
import { createGithubPullRequestFeedbackClient } from '@living-architecture/dev-workflow-v2-use-cases/external-clients/github/get-pr-feedback'
import { runGh } from '@living-architecture/dev-workflow-v2-use-cases/external-clients/github/github-cli'
import { createWorkflowRoutes } from '../features/workflow/entrypoint/workflow/entrypoint'
import {
  parseNumberArgument,
  parseOptionalStringArgument,
  parseStringArgument,
  parseStringArguments,
} from '../features/workflow/entrypoint/workflow/workflow-route-inputs'
import { ZodSchemaProvider } from '@living-architecture/dev-workflow-v2-use-cases/external-clients/zod/zod-schema-provider'

const workflowConfiguration = configureWorkflow({})
const workflowDefinition = workflowConfiguration
const routes = createWorkflowRoutes({
  createWorkflowRoutes: new CreateWorkflowRoutes(
    new ZodSchemaProvider(workflowDefinition.stateSchema),
    defineWorkflowRoutes,
  ),
  parseNumberArgument,
  parseStringArgument,
  parseOptionalStringArgument,
  parseStringArguments,
})
const bashForbidden = {
  commands: ['git push', 'gh pr'],
  flags: ['--no-verify', '--force', '--hard'],
}

const workflowRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const workflowCommand =
  'node "$PLUGIN_ROOT/com.openai.codex/dist/codex-workflow-command.mjs" --runtime=bundled'
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

class InvalidSleepDurationError extends Error {
  constructor() {
    super('sleepMs requires a finite non-negative number')
    this.name = 'InvalidSleepDurationError'
  }
}

/**
 * Performs an intentionally synchronous sleep for CLI polling.
 * Do not use this from async or request-serving contexts.
 */
function sleepMs(ms: number): void {
  if (!Number.isFinite(ms) || ms < 0) {
    throw new InvalidSleepDurationError()
  }

  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
}

/** @riviere-role main */
createCodexWorkflowCli({
  workflowDefinition,
  routes,
  bashForbidden,
  isWriteAllowed: workflowConfiguration.isWriteAllowed,
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
