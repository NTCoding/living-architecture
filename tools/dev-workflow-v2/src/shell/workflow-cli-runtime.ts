import { createWorkflowVerificationRunner } from '@living-architecture/dev-workflow-v2-use-cases/adapters/process/workflow-verification-runner'
import { runProcess } from '@living-architecture/dev-workflow-v2-use-cases/external-clients/process/run-process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  createDefaultProcessDeps,
  type PlatformContext,
} from '@nt-ai-lab/deterministic-agent-workflow-cli'
import { defineWorkflowRoutes } from '@living-architecture/dev-workflow-v2-use-cases/external-clients/deterministic-agent-workflow-cli/define-workflow-routes'
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
  commands: ['gh pr', 'git push'],
  flags: ['--no-verify', '--force', '--hard'],
}
const workflowRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const unknownCommandMessage = [
  '[dev-workflow-v2-automated-message]: Error: You tried to run a command that does not exist. STOP working immediately and switch to BLOCKED. Report this to the user along with a root cause analysis of why you tried to run a command that does not exist.',
  'STOP and fix the workflow. It is broken. Do not attempt to create a workaround. YOU must immediately switch to blocked and stop.',
].join('\n\n')

class InvalidSleepDurationError extends Error {
  constructor() {
    super('sleepMs requires a finite non-negative number')
    this.name = 'InvalidSleepDurationError'
  }
}

function sleepMs(ms: number): void {
  if (!Number.isFinite(ms) || ms < 0) {
    throw new InvalidSleepDurationError()
  }

  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
}

function buildWorkflowDeps(platform: PlatformContext) {
  return {
    getGitInfo: createWorkflowGitStatusReader(readGitRepositoryStatus),
    runLocalVerification: createWorkflowVerificationRunner(runProcess),
    getPrFeedback: createWorkflowPullRequestFeedbackReader(
      createGithubPullRequestFeedbackClient(runGh),
    ),
    createPullRequest: createWorkflowPullRequestCreator(createGithubPullRequestClient(runGh)),
    listSessionReviews: () => platform.store.listSessionReviews(platform.getSessionId()),
    sleepMs,
    now: platform.now,
  }
}

/** @riviere-role main */
export function createWorkflowCliRuntime() {
  return {
    workflowDefinition,
    routes,
    bashForbidden,
    isWriteAllowed: workflowConfiguration.isWriteAllowed,
    workflowRoot,
    processDeps: createDefaultProcessDeps(),
    unknownCommandMessage,
    stopPreventionMessage:
      '[dev-workflow-v2-automated-response] If you are blocked, switch to the `BLOCKED` state.',
    buildWorkflowDeps,
  }
}
