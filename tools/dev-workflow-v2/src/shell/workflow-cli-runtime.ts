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
import { createWorkflowRequiredChecksReader } from '@living-architecture/dev-workflow-v2-use-cases/adapters/github/workflow-required-checks-reader'
import { readGithubRequiredChecks } from '@living-architecture/dev-workflow-v2-use-cases/external-clients/github/get-required-checks'
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
import { createAcpReviewAgentClient } from '@nt-ai-lab/deterministic-agent-workflow-acp'
import { createRunCodeReview } from './run-code-review'

const workflowRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const currentPlatform: { platform?: PlatformContext } = {}
const runCodeReview = createRunCodeReview({
  getWorkflowDefinition: () => workflowDefinition,
  getPlatform: () => {
    if (currentPlatform.platform === undefined) {
      throw new PlatformNotInitialisedError()
    }
    return currentPlatform.platform
  },
  pluginRoot: workflowRoot,
  acpClient: createAcpReviewAgentClient({
    command: 'npx',
    args: ['@agentclientprotocol/claude-agent-acp@^0.24.2'],
    timeoutMs: 120_000,
    cancellationGraceMs: 1_000,
  }),
})
const workflowConfiguration = configureWorkflow({ runCodeReview })
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
const unknownCommandMessage = [
  '[dev-workflow-v2-automated-message]: Error: You tried to run a command that does not exist. STOP working immediately and switch to BLOCKED. Report this to the user along with a root cause analysis of why you tried to run a command that does not exist.',
  'STOP and fix the workflow. It is broken. Do not attempt to create a workaround. YOU must immediately switch to blocked and stop.',
].join('\n\n')

class PlatformNotInitialisedError extends Error {
  constructor() {
    super('runCodeReview invoked before the platform was initialised')
    this.name = 'PlatformNotInitialisedError'
  }
}

function buildWorkflowDeps(platform: PlatformContext) {
  currentPlatform.platform = platform
  return {
    getGitInfo: createWorkflowGitStatusReader(readGitRepositoryStatus),
    runLocalVerification: createWorkflowVerificationRunner(runProcess),
    getRequiredPullRequestChecks: createWorkflowRequiredChecksReader((request) =>
      readGithubRequiredChecks(runGh, request),
    ),
    getPrFeedback: createWorkflowPullRequestFeedbackReader(
      createGithubPullRequestFeedbackClient(runGh),
    ),
    createPullRequest: createWorkflowPullRequestCreator(createGithubPullRequestClient(runGh)),
    listSessionReviews: () =>
      platform.workflowEventStore.listSessionReviews(platform.getSessionId()),
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
