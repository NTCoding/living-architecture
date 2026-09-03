import { createWorkflowRunner, defineRoutes } from '@nt-ai-lab/deterministic-agent-workflow-cli'
import { configureWorkflow } from '@living-architecture/dev-workflow-v2-use-cases/commands/configure-workflow'
import { CreateWorkflowRoutes } from '@living-architecture/dev-workflow-v2-use-cases/commands/create-workflow-routes'
import { createWorkflowRoutes } from '../entrypoint'
import {
  parseNumberArgument,
  parseOptionalStringArgument,
  parseStringArgument,
  parseStringArguments,
} from '../workflow-route-inputs'
import { ZodSchemaProvider } from '@living-architecture/dev-workflow-v2-use-cases/external-clients/zod/zod-schema-provider'

const workflowConfiguration = configureWorkflow({})

export const runner = createWorkflowRunner({
  workflowDefinition: workflowConfiguration,
  routes: createWorkflowRoutes({
    createWorkflowRoutes: new CreateWorkflowRoutes(
      new ZodSchemaProvider(workflowConfiguration.stateSchema),
      defineRoutes,
    ),
    parseNumberArgument,
    parseStringArgument,
    parseOptionalStringArgument,
    parseStringArguments,
  }),
  bashForbidden: {
    commands: ['gh pr'],
    flags: ['--no-verify', '--force', '--hard'],
  },
  isWriteAllowed: workflowConfiguration.isWriteAllowed,
})
