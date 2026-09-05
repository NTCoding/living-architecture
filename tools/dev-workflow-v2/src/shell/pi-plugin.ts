import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { ExtensionAPI } from '@earendil-works/pi-coding-agent'
import { createPiWorkflowExtension } from '@nt-ai-lab/deterministic-agent-workflow-pi'
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
import { ZodSchemaProvider } from '@living-architecture/dev-workflow-v2-use-cases/external-clients/zod/zod-schema-provider'
import { createWorkflowRoutes } from '../features/workflow/entrypoint/workflow/entrypoint'
import { createWorkflowCliRuntime } from './workflow-cli-runtime'
import {
  parseNumberArgument,
  parseOptionalStringArgument,
  parseStringArgument,
  parseStringArguments,
} from '../features/workflow/entrypoint/workflow/workflow-route-inputs'

const sharedWorkflowRuntime = createWorkflowCliRuntime()
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
const pluginRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const workflowCommand = 'dev-workflow-v2:workflow'
class InvalidSleepDurationError extends Error {
  constructor() {
    super('sleepMs requires a finite non-negative number')
    this.name = 'InvalidSleepDurationError'
  }
}

const commandNames = [
  'choose-next-task',
  'code-review',
  'continue-planning',
  'create-pr',
  'list-review-threads',
  'optimize-factory',
  'planning-status',
  'start-implementation',
  'start-planning',
] as const

function sleepMs(milliseconds: number): void {
  if (!Number.isFinite(milliseconds) || milliseconds < 0) {
    throw new InvalidSleepDurationError()
  }

  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds)
}

function readPiCommandInstruction(
  commandName: (typeof commandNames)[number],
  argumentsText: string,
): string {
  return readFileSync(join(pluginRoot, 'commands', `${commandName}.md`), 'utf8')
    .replaceAll('${CLAUDE_PLUGIN_ROOT}', pluginRoot)
    .replaceAll('$ARGUMENTS', argumentsText)
    .replaceAll('/dev-workflow-v2:workflow', 'the `workflow` tool')
}

function registerPiCommands(pi: ExtensionAPI): void {
  for (const commandName of commandNames) {
    pi.registerCommand(`dev-workflow-v2:${commandName}`, {
      description: `Run dev-workflow-v2 ${commandName}.`,
      handler: async (argumentsText, context) => {
        const instruction = readPiCommandInstruction(commandName, argumentsText)
        pi.sendUserMessage(instruction, context.isIdle() ? undefined : { deliverAs: 'followUp' })
      },
    })
  }
}

const workflowExtension = createPiWorkflowExtension({
  workflowDefinition,
  routes,
  unknownCommandMessage: sharedWorkflowRuntime.unknownCommandMessage,
  bashForbidden,
  isWriteAllowed: workflowConfiguration.isWriteAllowed,
  pluginRoot,
  commandName: workflowCommand,
  stopPreventionMessage: sharedWorkflowRuntime.stopPreventionMessage,
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

/** @riviere-role main */
export default (pi: ExtensionAPI): void => {
  void workflowExtension(pi)
  registerPiCommands(pi)
}
