import {
  createWorkflowCli, createDefaultProcessDeps 
} from '@ntcoding/agentic-workflow-builder/cli'
import { WORKFLOW_DEFINITION } from '../features/workflow/infra/persistence/workflow-definition'
import {
  ROUTES, HOOKS, preToolUseHandler 
} from '../features/workflow/entrypoint/workflow-cli'
import {
  getGitInfo, runGh 
} from '../features/workflow/infra/external-clients/git/git'
import { createGetPrFeedback } from '../features/workflow/infra/external-clients/github/get-pr-feedback'

/** @riviere-role main */
// WorkflowCliConfig drops TStateName/TOperation (defaults to string).
// Safe — StateName ⊂ string, WorkflowOperation ⊂ string.
createWorkflowCli({
  // @ts-expect-error WorkflowCliConfig widens StateName/WorkflowOperation to string
  workflowDefinition: WORKFLOW_DEFINITION,
  routes: ROUTES,
  hooks: HOOKS,
  // @ts-expect-error WorkflowCliConfig widens StateName/WorkflowOperation to string
  preToolUseHandler,
  processDeps: createDefaultProcessDeps(),
  buildWorkflowDeps: (platform) => ({
    getGitInfo,
    checkPrChecks: () => true,
    getPrFeedback: createGetPrFeedback(runGh),
    now: platform.now,
  }),
})
