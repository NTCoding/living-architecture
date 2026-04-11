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

/** @riviere-role main */
export default createOpenCodeWorkflowPlugin<
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
  buildWorkflowDeps: (platform) => ({
    getGitInfo,
    checkPrChecks: () => true,
    getPrFeedback: createGetPrFeedback(runGh),
    now: platform.now,
  }),
})
