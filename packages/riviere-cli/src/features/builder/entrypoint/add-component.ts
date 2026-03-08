import { Command } from 'commander'
import {
  getDefaultGraphPathDescription,
  resolveGraphPath,
} from '../../../platform/infra/graph-persistence/graph-path'
import { addComponent } from '../commands/add-component'

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
      const customProperty = options.customProperty ?? []

      await addComponent({
        componentType: options.type,
        name: options.name,
        domain: options.domain,
        module: options.module,
        repository: options.repository,
        filePath: options.filePath,
        graphPath: resolveGraphPath(options.graph),
        ...(options.lineNumber ? { lineNumber: parseInt(options.lineNumber, 10) } : {}),
        ...(options.route !== undefined ? { route: options.route } : {}),
        ...(options.apiType !== undefined ? { apiType: options.apiType } : {}),
        ...(options.httpMethod !== undefined ? { httpMethod: options.httpMethod } : {}),
        ...(options.httpPath !== undefined ? { httpPath: options.httpPath } : {}),
        ...(options.operationName !== undefined ? { operationName: options.operationName } : {}),
        ...(options.entity !== undefined ? { entity: options.entity } : {}),
        ...(options.eventName !== undefined ? { eventName: options.eventName } : {}),
        ...(options.eventSchema !== undefined ? { eventSchema: options.eventSchema } : {}),
        ...(options.subscribedEvents !== undefined
          ? { subscribedEvents: options.subscribedEvents }
          : {}),
        ...(options.customType !== undefined ? { customType: options.customType } : {}),
        ...(customProperty.length > 0 ? { customProperty } : {}),
        ...(options.description !== undefined ? { description: options.description } : {}),
        outputJson: options.json ?? false,
      })
    })
}
