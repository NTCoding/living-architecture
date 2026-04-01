import { Command } from 'commander'
import { CliErrorCode } from '../../../platform/infra/cli/presentation/error-codes'
import {
  getDefaultGraphPathDescription,
  resolveGraphPath,
} from '../../../platform/infra/graph-persistence/graph-path'
import { formatError, formatSuccess } from '../../../platform/infra/cli/presentation/output'
import { getAddComponentHints } from '../../../platform/infra/cli/presentation/add-component-hints'
import { addComponent } from '../commands/add-component'
import type { AddComponentInput } from '../commands/add-component-input'
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
export function createAddComponentCommand(): Command {
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
      const input: AddComponentInput = {
        componentType: options.type,
        name: options.name,
        domain: options.domain,
        module: options.module,
        repository: options.repository,
        filePath: options.filePath,
        graphPath: resolveGraphPath(options.graph),
        ...(options.lineNumber ? { lineNumber: parseInt(options.lineNumber, 10) } : {}),
        ...(options.route ? { route: options.route } : {}),
        ...(options.apiType ? { apiType: options.apiType } : {}),
        ...(options.httpMethod ? { httpMethod: options.httpMethod } : {}),
        ...(options.httpPath ? { httpPath: options.httpPath } : {}),
        ...(options.operationName ? { operationName: options.operationName } : {}),
        ...(options.entity ? { entity: options.entity } : {}),
        ...(options.eventName ? { eventName: options.eventName } : {}),
        ...(options.eventSchema ? { eventSchema: options.eventSchema } : {}),
        ...(options.subscribedEvents ? { subscribedEvents: options.subscribedEvents } : {}),
        ...(options.customType ? { customType: options.customType } : {}),
        ...(options.customProperty && options.customProperty.length > 0
          ? { customProperty: options.customProperty }
          : {}),
        ...(options.description ? { description: options.description } : {}),
      }
      const result = await addComponent(input)

      if (!result.success) {
        const cliErrorCode = toCliErrorCode(result.code)
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

function toCliErrorCode(code: AddComponentErrorCode): CliErrorCode {
  switch (code) {
    case 'VALIDATION_ERROR':
      return CliErrorCode.ValidationError
    case 'GRAPH_NOT_FOUND':
      return CliErrorCode.GraphNotFound
    case 'DOMAIN_NOT_FOUND':
      return CliErrorCode.DomainNotFound
    case 'CUSTOM_TYPE_NOT_FOUND':
      return CliErrorCode.CustomTypeNotFound
    case 'DUPLICATE_COMPONENT':
      return CliErrorCode.DuplicateComponent
  }
}
