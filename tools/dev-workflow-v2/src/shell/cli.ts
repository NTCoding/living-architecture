import { createClaudeCodeWorkflowCli } from '@nt-ai-lab/deterministic-agent-workflow-claude-code'
import { createWorkflowCliRuntime } from './workflow-cli-runtime'

const sharedWorkflowRuntime = createWorkflowCliRuntime()

/** @riviere-role main */
createClaudeCodeWorkflowCli({
  workflowDefinition: sharedWorkflowRuntime.workflowDefinition,
  routes: sharedWorkflowRuntime.routes,
  unknownCommandMessage: sharedWorkflowRuntime.unknownCommandMessage,
  bashForbidden: sharedWorkflowRuntime.bashForbidden,
  isWriteAllowed: sharedWorkflowRuntime.isWriteAllowed,
  processDeps: sharedWorkflowRuntime.processDeps,
  stopPreventionMessage: sharedWorkflowRuntime.stopPreventionMessage,
  buildWorkflowDeps: sharedWorkflowRuntime.buildWorkflowDeps,
})
