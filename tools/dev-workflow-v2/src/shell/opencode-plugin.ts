import { createOpenCodeWorkflowPlugin } from '@nt-ai-lab/deterministic-agent-workflow-opencode'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  dirname, join 
} from 'node:path'
import type {
  Workflow, WorkflowDeps 
} from '../features/workflow/domain/workflow'
import type {
  WorkflowState,
  StateName,
  WorkflowOperation,
} from '../features/workflow/domain/workflow-types'
import { WORKFLOW_DEFINITION } from '../features/workflow/infra/persistence/workflow-definition'
import {
  ROUTES, PRE_TOOL_USE_POLICY 
} from '../features/workflow/entrypoint/workflow-cli'
import {
  getGitInfo, runGh 
} from '../features/workflow/infra/external-clients/git/git'
import { createGetPrFeedback } from '../features/workflow/infra/external-clients/github/get-pr-feedback'

function sleepMs(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
}

const pluginRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const REVIEW_AGENT_NAMES = [
  'architecture-review',
  'code-review',
  'bug-scanner',
  'task-check',
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

function parseClaudeAgentFile(agentName: (typeof REVIEW_AGENT_NAMES)[number]): OpenCodeAgentConfig {
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
    hidden: true,
    prompt,
    ...(description === undefined ? {} : { description }),
    ...(color === undefined ? {} : { color }),
  }
}

function registerReviewSubagents(config: OpenCodeConfigInput): void {
  const agents = config.agent ?? {}
  for (const agentName of REVIEW_AGENT_NAMES) {
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
  workflowDefinition: WORKFLOW_DEFINITION,
  routes: ROUTES,
  bashForbidden: PRE_TOOL_USE_POLICY.bashForbidden,
  isWriteAllowed: PRE_TOOL_USE_POLICY.isWriteAllowed,
  pluginRoot,
  commandDirectories: [join(pluginRoot, 'commands')],
  commandPrefix: 'dev-workflow-v2:',
  buildWorkflowDeps: (platform) => ({
    getGitInfo,
    getPrFeedback: createGetPrFeedback(runGh),
    sleepMs,
    now: platform.now,
  }),
})

/** @riviere-role main */
export default async (
  input?: Parameters<typeof basePlugin>[0],
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
