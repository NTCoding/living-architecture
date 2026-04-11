import { createOpenCodeWorkflowPlugin } from '@ntcoding/agentic-workflow-builder/opencode'
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

const pluginRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

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
    },
  }
}
