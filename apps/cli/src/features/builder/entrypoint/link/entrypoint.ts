import { Command } from 'commander'
import { getDefaultGraphPathDescription } from '../../../../infra/cli/presentation/graph-path-option'
import * as cliOutput from '../../../../infra/cli/presentation/output'
import { CliErrorCode } from '../../../../infra/cli/presentation/error-codes'
import type { LinkComponents } from '@living-architecture/riviere-builder-use-cases/features/builder/commands/link-components'
import { parseLinkSourceLocation } from './link-source-location-options'

interface LinkOptions {
  from: string
  toDomain: string
  toModule: string
  toType: string
  toName: string
  linkType?: string
  relationshipType?: string
  condition?: string
  repository?: string
  filePath?: string
  lineNumber?: string
  columnNumber?: string
  graph?: string
  json?: boolean
}

/** @riviere-role cli-entrypoint */
export function createLinkCommand(linkComponents: LinkComponents): Command {
  return new Command('link')
    .description('Link two components')
    .addHelpText(
      'after',
      `
Examples:
  $ riviere builder link \\
      --from "orders:api:api:postorders" \\
      --to-domain orders --to-module checkout --to-type UseCase --to-name "place-order" \\
      --link-type sync

  $ riviere builder link \\
      --from "orders:checkout:domainop:orderbegin" \\
      --to-domain orders --to-module events --to-type Event --to-name "order-placed" \\
      --link-type async
`,
    )
    .requiredOption('--from <component-id>', 'Source component ID')
    .requiredOption('--to-domain <domain>', 'Target domain')
    .requiredOption('--to-module <module>', 'Target module')
    .requiredOption(
      '--to-type <type>',
      'Target component type (UI, API, UseCase, DomainOp, Event, EventHandler, Custom)',
    )
    .requiredOption('--to-name <name>', 'Target component name')
    .option('--link-type <type>', 'Link type (sync, async)')
    .option('--relationship-type <name>', 'Project-defined relationship type')
    .option('--condition <condition>', 'Condition retained exactly as supplied')
    .option('--repository <repository>', 'Source repository identifier')
    .option('--file-path <path>', 'Source file path')
    .option('--line-number <n>', 'Source line number')
    .option('--column-number <n>', 'Source column number')
    .option('--graph <path>', getDefaultGraphPathDescription())
    .option('--json', 'Output result as JSON')
    .action(async (options: LinkOptions) => {
      const sourceLocationResult = parseLinkSourceLocation(options)
      if (!sourceLocationResult.success) {
        console.log(
          JSON.stringify(
            cliOutput.formatError(CliErrorCode.ValidationError, sourceLocationResult.message, []),
          ),
        )
        return
      }

      const result = linkComponents.execute({
        from: options.from,
        graphPathOption: options.graph,
        targetDomain: options.toDomain,
        targetModule: options.toModule,
        targetName: options.toName,
        targetType: options.toType,
        type: options.linkType,
        ...(options.condition === undefined ? {} : { condition: options.condition }),
        ...(options.relationshipType === undefined
          ? {}
          : { relationshipType: options.relationshipType }),
        ...(sourceLocationResult.sourceLocation === undefined
          ? {}
          : { sourceLocation: sourceLocationResult.sourceLocation }),
      })
      if (!result.success) {
        const errorCodeByResult = {
          COMPONENT_NOT_FOUND: CliErrorCode.ComponentNotFound,
          GRAPH_CORRUPTED: CliErrorCode.GraphCorrupted,
          GRAPH_NOT_FOUND: CliErrorCode.GraphNotFound,
          VALIDATION_ERROR: CliErrorCode.ValidationError,
        } as const
        const errorCode = errorCodeByResult[result.code]

        console.log(
          JSON.stringify(cliOutput.formatError(errorCode, result.message, result.suggestions)),
        )
        return
      }

      if (options.json) {
        console.log(JSON.stringify(cliOutput.formatSuccess({ link: result.link })))
      }
    })
}
