import { createDefaultProcessDeps } from '@nt-ai-lab/deterministic-agent-workflow-cli'
import { createClaudeCodeWorkflowCli } from '@nt-ai-lab/deterministic-agent-workflow-claude-code'
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

/** @riviere-role main */
// WorkflowCliConfig drops TStateName/TOperation (defaults to string).
// Safe — StateName ⊂ string, WorkflowOperation ⊂ string.
createClaudeCodeWorkflowCli({
  // @ts-expect-error WorkflowCliConfig widens StateName/WorkflowOperation to string
  workflowDefinition: WORKFLOW_DEFINITION,
  routes: ROUTES,
  bashForbidden: PRE_TOOL_USE_POLICY.bashForbidden,
  isWriteAllowed: PRE_TOOL_USE_POLICY.isWriteAllowed,
  processDeps: createDefaultProcessDeps(),
  buildWorkflowDeps: (platform) => ({
    getGitInfo,
    getPrFeedback: createGetPrFeedback(runGh),
    sleepMs,
    now: platform.now,
  }),
})
