import { existsSync } from 'node:fs'
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
import { pushGitBranch } from '@living-architecture/dev-workflow-v2-use-cases/external-clients/git/push-git-branch'
import { runGh } from '@living-architecture/dev-workflow-v2-use-cases/external-clients/github/github-cli'
import { createWorkflowRoutes } from '../features/workflow/entrypoint/workflow/entrypoint'
import { formatPullRequestDetailsFailure } from '../features/workflow/entrypoint/workflow/format-pull-request-details-failure'
import { parsePullRequestDescriptionOptions } from '../features/workflow/entrypoint/workflow/pull-request-description-input'
import {
  parseNumberArgument,
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
  parseStringArguments,
  parsePullRequestDescriptionOptions,
  formatPullRequestDetailsFailure,
})
const bashForbidden = {
  commands: ['gh pr', 'git push'],
  flags: ['--no-verify', '--force', '--hard'],
}
const workflowRoot = resolveWorkflowRoot(dirname(fileURLToPath(import.meta.url)))
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

class WorkflowRootNotFoundError extends Error {
  constructor() {
    super('Could not locate the dev-workflow-v2 package root')
    this.name = 'WorkflowRootNotFoundError'
  }
}

function resolveWorkflowRoot(moduleDirectory: string): string {
  if (existsSync(join(moduleDirectory, 'package.json'))) return moduleDirectory
  const parentDirectory = dirname(moduleDirectory)
  if (parentDirectory === moduleDirectory) throw new WorkflowRootNotFoundError()
  return resolveWorkflowRoot(parentDirectory)
}

function sleepMs(milliseconds: number): void {
  if (!Number.isFinite(milliseconds) || milliseconds < 0) {
    throw new InvalidSleepDurationError()
  }
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds)
}

function buildWorkflowDeps(platform: PlatformContext) {
  return {
    getGitInfo: createWorkflowGitStatusReader(readGitRepositoryStatus),
    getPrFeedback: createWorkflowPullRequestFeedbackReader(
      createGithubPullRequestFeedbackClient(runGh),
    ),
    createPullRequest: createWorkflowPullRequestCreator(
      createGithubPullRequestClient(runGh),
      pushGitBranch,
    ),
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
