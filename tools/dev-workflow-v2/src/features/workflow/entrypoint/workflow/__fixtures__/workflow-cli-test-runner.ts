import { createWorkflowRunner, defineRoutes } from '@nt-ai-lab/deterministic-agent-workflow-cli'
import { configureWorkflow } from '@living-architecture/dev-workflow-v2-use-cases/commands/configure-workflow'
import { CreateWorkflowRoutes } from '@living-architecture/dev-workflow-v2-use-cases/commands/create-workflow-routes'
import { createWorkflowRoutes } from '../entrypoint'
import { formatPullRequestDetailsFailure } from '../format-pull-request-details-failure'
import { parsePullRequestDescriptionOptions } from '../pull-request-description-input'
import {
  parseNumberArgument,
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
    parseStringArguments,
    parsePullRequestDescriptionOptions,
    formatPullRequestDetailsFailure,
  }),
  unknownCommandMessage: 'Unknown test workflow command.',
  bashForbidden: {
    commands: ['gh pr', 'git push'],
    flags: ['--no-verify', '--force', '--hard'],
  },
  isWriteAllowed: workflowConfiguration.isWriteAllowed,
})
