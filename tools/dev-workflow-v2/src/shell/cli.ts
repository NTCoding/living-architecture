import { createDefaultProcessDeps } from '@nt-ai-lab/deterministic-agent-workflow-cli'
import { defineWorkflowRoutes } from '@living-architecture/dev-workflow-v2-use-cases/external-clients/deterministic-agent-workflow-cli/define-workflow-routes'
import { createClaudeCodeWorkflowCli } from '@nt-ai-lab/deterministic-agent-workflow-claude-code'
import { configureWorkflow } from '@living-architecture/dev-workflow-v2-use-cases/commands/configure-workflow'
import { CreateWorkflowRoutes } from '@living-architecture/dev-workflow-v2-use-cases/commands/create-workflow-routes'
import { createWorkflowRoutes } from '../features/workflow/entrypoint/workflow/entrypoint'
import { formatPullRequestDetailsFailure } from '../features/workflow/entrypoint/workflow/format-pull-request-details-failure'
import { parsePullRequestDescriptionOptions } from '../features/workflow/entrypoint/workflow/pull-request-description-input'
import {
  parseNumberArgument,
  parseStringArgument,
  parseStringArguments,
} from '../features/workflow/entrypoint/workflow/workflow-route-inputs'
import { ZodSchemaProvider } from '@living-architecture/dev-workflow-v2-use-cases/external-clients/zod/zod-schema-provider'
import { createWorkflowCliRuntime } from './workflow-cli-runtime'

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
  parseStringArguments,
  parsePullRequestDescriptionOptions,
  formatPullRequestDetailsFailure,
})
const bashForbidden = {
  commands: ['gh pr', 'git push'],
  flags: ['--no-verify', '--force', '--hard'],
}

/** @riviere-role main */
createClaudeCodeWorkflowCli({
  workflowDefinition,
  routes,
  unknownCommandMessage: sharedWorkflowRuntime.unknownCommandMessage,
  bashForbidden,
  isWriteAllowed: workflowConfiguration.isWriteAllowed,
  processDeps: createDefaultProcessDeps(),
  stopPreventionMessage: sharedWorkflowRuntime.stopPreventionMessage,
  buildWorkflowDeps: sharedWorkflowRuntime.buildWorkflowDeps,
})
