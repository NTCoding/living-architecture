import { createWorkflowCli } from '@ntcoding/agentic-workflow-builder/cli'
import { WORKFLOW_DEFINITION } from '../workflow-definition/infra/external-client/agentic-workflow-builder/workflow-definition'
import {
  ROUTES, HOOKS, preToolUseHandler 
} from '../entrypoint/workflow-cli'
import {
  getGitInfo, runGh 
} from '../infra/cli/git'
import { createGetPrFeedback } from '../infra/external-client/github/get-pr-feedback'

// WorkflowCliConfig drops TStateName/TOperation (defaults to string).
// Safe — StateName ⊂ string, WorkflowOperation ⊂ string.
createWorkflowCli({
  // @ts-expect-error WorkflowCliConfig widens StateName/WorkflowOperation to string
  workflowDefinition: WORKFLOW_DEFINITION,
  routes: ROUTES,
  hooks: HOOKS,
  // @ts-expect-error WorkflowCliConfig widens StateName/WorkflowOperation to string
  preToolUseHandler,
  buildWorkflowDeps: (platform) => ({
    getGitInfo,
    checkPrChecks: () => true,
    getPrFeedback: createGetPrFeedback(runGh),
    now: platform.now,
  }),
})
