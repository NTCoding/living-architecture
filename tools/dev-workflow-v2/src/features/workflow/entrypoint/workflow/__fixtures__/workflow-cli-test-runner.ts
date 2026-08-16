import { createWorkflowRunner, defineRoutes } from '@nt-ai-lab/deterministic-agent-workflow-cli'
import { configureWorkflow } from '@living-architecture/dev-workflow-v2-use-cases/commands/configure-workflow'
import { createWorkflowRoutes } from '../entrypoint'
import {
  parseNumberArgument,
  parseOptionalStringArgument,
  parseStringArgument,
  parseStringArguments,
} from '../workflow-route-inputs'

const workflowConfiguration = configureWorkflow({})

export const runner = createWorkflowRunner({
  workflowDefinition: workflowConfiguration,
  routes: createWorkflowRoutes({
    stateNameSchema: workflowConfiguration.stateSchema,
    defineRoutes,
    parseNumberArgument,
    parseStringArgument,
    parseOptionalStringArgument,
    parseStringArguments,
  }),
  bashForbidden: {
    commands: ['git push', 'gh pr'],
    flags: ['--no-verify', '--force', '--hard'],
  },
  isWriteAllowed: workflowConfiguration.isWriteAllowed,
})
