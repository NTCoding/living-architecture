import { Command } from 'commander'
import {
  readFile, writeFile 
} from 'node:fs/promises'
import {
  RiviereBuilder,
  CustomTypeNotFoundError,
  DomainNotFoundError,
  DuplicateComponentError,
} from '@living-architecture/riviere-builder'
import type { SourceLocation } from '@living-architecture/riviere-schema'
import { parseRiviereGraph } from '@living-architecture/riviere-schema'
import {
  getDefaultGraphPathDescription,
  resolveGraphPath,
} from '../../../platform/infra/graph-persistence/graph-path'
import { fileExists } from '../../../platform/infra/graph-persistence/file-existence'
import {
  formatError, formatSuccess 
} from '../../../platform/infra/cli-presentation/output'
import { CliErrorCode } from '../../../platform/infra/cli-presentation/error-codes'
import {
  isValidComponentType,
  VALID_COMPONENT_TYPES,
} from '../../../platform/infra/cli-presentation/component-types'
import { getErrorMessage } from '../../../platform/infra/errors/errors'
import {
  addComponentToBuilder,
  type AddComponentOptions,
} from '../commands/add-component-to-builder'

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
    .action(async (options: AddComponentOptions) => {
      if (!isValidComponentType(options.type)) {
        console.log(
          JSON.stringify(
            formatError(CliErrorCode.ValidationError, `Invalid component type: ${options.type}`, [
              `Valid types: ${VALID_COMPONENT_TYPES.join(', ')}`,
            ]),
          ),
        )
        return
      }
      const componentType = options.type

      const graphPath = resolveGraphPath(options.graph)
      const graphExists = await fileExists(graphPath)

      if (!graphExists) {
        console.log(
          JSON.stringify(
            formatError(CliErrorCode.GraphNotFound, `Graph not found at ${graphPath}`, [
              'Run riviere builder init first',
            ]),
          ),
        )
        return
      }

      const content = await readFile(graphPath, 'utf-8')
      const parsed: unknown = JSON.parse(content)
      const graph = parseRiviereGraph(parsed)
      const builder = RiviereBuilder.resume(graph)

      const sourceLocation: SourceLocation = {
        repository: options.repository,
        filePath: options.filePath,
        ...(options.lineNumber ? { lineNumber: parseInt(options.lineNumber, 10) } : {}),
      }

      try {
        const componentId = addComponentToBuilder(builder, componentType, options, sourceLocation)
        await writeFile(graphPath, builder.serialize(), 'utf-8')
        if (options.json) {
          console.log(JSON.stringify(formatSuccess({ componentId })))
        }
      } catch (error) {
        if (error instanceof DomainNotFoundError) {
          console.log(
            JSON.stringify(
              formatError(CliErrorCode.DomainNotFound, error.message, [
                'Run riviere builder add-domain first',
              ]),
            ),
          )
          return
        }
        if (error instanceof CustomTypeNotFoundError) {
          console.log(
            JSON.stringify(
              formatError(CliErrorCode.CustomTypeNotFound, error.message, [
                'Run riviere builder add-custom-type first',
              ]),
            ),
          )
          return
        }
        if (error instanceof DuplicateComponentError) {
          console.log(
            JSON.stringify(formatError(CliErrorCode.DuplicateComponent, error.message, [])),
          )
          return
        }
        console.log(
          JSON.stringify(formatError(CliErrorCode.ValidationError, getErrorMessage(error), [])),
        )
      }
    })
}
