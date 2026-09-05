import { createOpenCodeWorkflowPlugin } from '@nt-ai-lab/deterministic-agent-workflow-opencode'
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
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
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

type Workflow = ReturnType<typeof workflowDefinition.buildWorkflow>
type WorkflowState = ReturnType<typeof workflowDefinition.initialState>
type WorkflowDeps = Parameters<typeof workflowDefinition.buildWorkflow>[1]
type StateName = Parameters<typeof workflowDefinition.buildTransitionContext>[1]
type WorkflowOperation = Parameters<NonNullable<typeof workflowDefinition.getOperationBody>>[0]

function sleepMs(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
}

const pluginRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const AGENT_NAMES = [
  'architecture-review',
  'code-review',
  'bug-scanner',
  'task-check',
  'component-design-architect',
  'component-design-review',
] as const

const OPEN_CODE_WORKFLOW_COMMAND = 'dev-workflow-v2:workflow'

const OPEN_CODE_WORKFLOW_TEMPLATE = [
  'Use the `workflow` tool.',
  '',
  'Arguments:',
  '- First token of `$ARGUMENTS`: `operation`',
  '- Remaining tokens of `$ARGUMENTS`: `args` array',
  '',
  'Examples:',
  '- `/dev-workflow-v2:workflow init` -> `workflow({ operation: "init" })`',
  '- `/dev-workflow-v2:workflow transition REVIEWING`',
  '  -> `workflow({ operation: "transition", args: ["REVIEWING"] })`',
].join('\n')

type BaseHooks = Awaited<ReturnType<typeof basePlugin>>
type OpenCodeConfigInput = Parameters<NonNullable<BaseHooks['config']>>[0]
type OpenCodeAgentConfig = NonNullable<NonNullable<OpenCodeConfigInput['agent']>[string]>

function trimTrailingCarriageReturn(line: string): string {
  return line.endsWith('\r') ? line.slice(0, -1) : line
}

function frontmatterValue(lines: ReadonlyArray<string>, key: string): string | undefined {
  const prefix = `${key}:`
  const line = lines.find((entry) => entry.startsWith(prefix))
  if (line === undefined) {
    return undefined
  }

  return line.slice(prefix.length).trim()
}

function parseClaudeAgentFile(agentName: (typeof AGENT_NAMES)[number]): OpenCodeAgentConfig {
  const source = readFileSync(join(pluginRoot, 'agents', `${agentName}.md`), 'utf8')
  const lines = source.split('\n').map(trimTrailingCarriageReturn)
  const hasFrontmatter = lines[0] === '---'
  const frontmatterEndIndex = hasFrontmatter ? lines.indexOf('---', 1) : -1
  const frontmatter = frontmatterEndIndex > 0 ? lines.slice(1, frontmatterEndIndex) : []
  const contentStartIndex = frontmatterEndIndex > 0 ? frontmatterEndIndex + 1 : 0
  const promptStartIndex = lines.findIndex(
    (line, index) => index >= contentStartIndex && line !== '',
  )

  const prompt = lines
    .slice(promptStartIndex < 0 ? lines.length : promptStartIndex)
    .join('\n')
    .trim()
  const description = frontmatterValue(frontmatter, 'description')
  const color = frontmatterValue(frontmatter, 'color')

  return {
    mode: 'subagent',
    prompt,
    ...(description === undefined ? {} : { description }),
    ...(color === undefined ? {} : { color }),
  }
}

function registerReviewSubagents(config: OpenCodeConfigInput): void {
  const agents = config.agent ?? {}
  for (const agentName of AGENT_NAMES) {
    agents[agentName] = {
      ...parseClaudeAgentFile(agentName),
      ...agents[agentName],
    }
  }
  config.agent = agents
}

const basePlugin = createOpenCodeWorkflowPlugin<
  Workflow,
  WorkflowState,
  WorkflowDeps,
  StateName,
  WorkflowOperation
>({
  workflowDefinition,
  routes,
  bashForbidden,
  isWriteAllowed: workflowConfiguration.isWriteAllowed,
  pluginRoot,
  commandDirectories: [join(pluginRoot, 'commands')],
  commandPrefix: 'dev-workflow-v2:',
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
export default async (
  input: Parameters<typeof basePlugin>[0],
  options?: Parameters<typeof basePlugin>[1],
) => {
  const hooks = await basePlugin(input, options)
  const baseConfigHook = hooks.config

  return {
    ...hooks,
    config: async (config: OpenCodeConfigInput) => {
      if (baseConfigHook !== undefined) {
        await baseConfigHook(config)
      }

      const command = config.command?.[OPEN_CODE_WORKFLOW_COMMAND]
      if (command !== undefined) {
        command.template = OPEN_CODE_WORKFLOW_TEMPLATE
      }

      registerReviewSubagents(config)
    },
  }
}
