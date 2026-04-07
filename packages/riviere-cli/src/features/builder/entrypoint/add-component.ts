import { Command } from 'commander'
import { CliErrorCode } from '../../../platform/infra/cli/presentation/error-codes'
import { getDefaultGraphPathDescription } from '../../../platform/infra/cli/presentation/graph-path-option'
import {
  formatError, formatSuccess 
} from '../../../platform/infra/cli/presentation/output'
import { getAddComponentHints } from '../../../platform/infra/cli/presentation/add-component-hints'
import { toAddComponentInput } from '../../../platform/infra/cli/input/add-component-options'
import type { AddComponent } from '../commands/add-component'
import type { AddComponentErrorCode } from '../commands/add-component-result'

interface CliOptions {
  type: string
  name: string
  domain: string
  module: string
  repository: string
  filePath: string
  route?: string
  apiType?: string
  httpMethod?: string
  httpPath?: string
  operationName?: string
  entity?: string
  eventName?: string
  eventSchema?: string
  subscribedEvents?: string
  customType?: string
  customProperty?: string[]
  description?: string
  lineNumber?: string
  graph?: string
  json?: boolean
}

/** @riviere-role cli-entrypoint */
export function createAddComponentCommand(addComponent: AddComponent): Command {
  return new Command('add-component')
    .description('Add a component to the graph')
    .requiredOption(
      '--type <type>',
      'Component type (UI, API, UseCase, DomainOp, Event, EventHandler, Custom)',
    )
    .requiredOption('--name <name>', 'Component name')
    .requiredOption('--domain <domain>', 'Domain name')
    .requiredOption('--module <module>', 'Module name')
    .requiredOption('--repository <url>', 'Source repository URL')
    .requiredOption('--file-path <path>', 'Source file path')
    .option('--route <route>', 'UI route path')
    .option('--api-type <type>', 'API type (REST, GraphQL, other)')
    .option('--http-method <method>', 'HTTP method')
    .option('--http-path <path>', 'HTTP endpoint path')
    .option('--operation-name <name>', 'Operation name (DomainOp)')
    .option('--entity <entity>', 'Entity name (DomainOp)')
    .option('--event-name <name>', 'Event name')
    .option('--event-schema <schema>', 'Event schema definition')
    .option('--subscribed-events <events>', 'Comma-separated subscribed event names')
    .option('--custom-type <name>', 'Custom type name')
    .option(
      '--custom-property <key:value>',
      'Custom property (repeatable)',
      (val, acc: string[]) => [...acc, val],
      [],
    )
    .option('--description <desc>', 'Component description')
    .option('--line-number <n>', 'Source line number')
    .option('--graph <path>', getDefaultGraphPathDescription())
    .option('--json', 'Output result as JSON')
    .action(async (options: CliOptions) => {
      const result = addComponent.execute(toAddComponentInput(options))

      if (!result.success) {
        const cliErrorCode = CLI_ERROR_CODES[result.code]
        console.log(
          JSON.stringify(
            formatError(cliErrorCode, result.message, getAddComponentHints(cliErrorCode)),
          ),
        )
        return
      }

      if (options.json) {
        console.log(JSON.stringify(formatSuccess({ componentId: result.componentId })))
      }
    })
}

const CLI_ERROR_CODES: Record<AddComponentErrorCode, CliErrorCode> = {
  VALIDATION_ERROR: CliErrorCode.ValidationError,
  GRAPH_NOT_FOUND: CliErrorCode.GraphNotFound,
  DOMAIN_NOT_FOUND: CliErrorCode.DomainNotFound,
  CUSTOM_TYPE_NOT_FOUND: CliErrorCode.CustomTypeNotFound,
  DUPLICATE_COMPONENT: CliErrorCode.DuplicateComponent,
}
