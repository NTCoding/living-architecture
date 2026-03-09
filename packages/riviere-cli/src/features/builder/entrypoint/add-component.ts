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
      const commandInput = {
        componentType: options.type,
        name: options.name,
        domain: options.domain,
        module: options.module,
        repository: options.repository,
        filePath: options.filePath,
        graphPath: resolveGraphPath(options.graph),
        outputJson: options.json ?? false,
      }

      if (options.lineNumber !== undefined) {
        Object.assign(commandInput, {lineNumber: Number.parseInt(options.lineNumber, 10),})
      }

      const optionalStringFields = [
        ['route', options.route],
        ['apiType', options.apiType],
        ['httpMethod', options.httpMethod],
        ['httpPath', options.httpPath],
        ['operationName', options.operationName],
        ['entity', options.entity],
        ['eventName', options.eventName],
        ['eventSchema', options.eventSchema],
        ['subscribedEvents', options.subscribedEvents],
        ['customType', options.customType],
        ['description', options.description],
      ] as const

      for (const [key, value] of optionalStringFields) {
        if (value !== undefined) {
          Object.assign(commandInput, { [key]: value })
        }
      }

      if (customProperty.length > 0) {
        Object.assign(commandInput, { customProperty })
      }

      await addComponent(commandInput)
    })
}
