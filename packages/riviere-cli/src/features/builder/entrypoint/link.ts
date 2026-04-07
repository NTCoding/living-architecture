import { Command } from 'commander'
import { ComponentId } from '@living-architecture/riviere-builder'
import { getDefaultGraphPathDescription } from '../../../platform/infra/cli/presentation/graph-path-option'
import {
  formatSuccess, formatError 
} from '../../../platform/infra/cli/presentation/output'
import {
  isValidLinkType,
  normalizeComponentType,
} from '../../../platform/infra/cli/input/component-types'
import {
  validateComponentType,
  validateLinkType,
} from '../../../platform/infra/cli/input/validation'
import { CliErrorCode } from '../../../platform/infra/cli/presentation/error-codes'
import type { LinkComponents } from '../commands/link-components'

interface LinkOptions {
  from: string
  toDomain: string
  toModule: string
  toType: string
  toName: string
  linkType?: string
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
    .option('--graph <path>', getDefaultGraphPathDescription())
    .option('--json', 'Output result as JSON')
    .action(async (options: LinkOptions) => {
      const componentTypeValidation = validateComponentType(options.toType)
      if (!componentTypeValidation.valid) {
        console.log(componentTypeValidation.errorJson)
        return
      }

      const linkTypeValidation = validateLinkType(options.linkType)
      if (!linkTypeValidation.valid) {
        console.log(linkTypeValidation.errorJson)
        return
      }

      const linkType =
        options.linkType !== undefined && isValidLinkType(options.linkType)
          ? options.linkType
          : undefined

      const result = linkComponents.execute({
        from: options.from,
        graphPathOption: options.graph,
        to: ComponentId.create({
          domain: options.toDomain,
          module: options.toModule,
          type: normalizeComponentType(options.toType),
          name: options.toName,
        }).toString(),
        type: linkType,
      })
      if (!result.success) {
        const errorCodeByResult = {
          COMPONENT_NOT_FOUND: CliErrorCode.ComponentNotFound,
          GRAPH_CORRUPTED: CliErrorCode.GraphCorrupted,
          GRAPH_NOT_FOUND: CliErrorCode.GraphNotFound,
        } as const
        const errorCode = errorCodeByResult[result.code]

        console.log(JSON.stringify(formatError(errorCode, result.message, result.suggestions)))
        return
      }

      if (options.json) {
        console.log(JSON.stringify(formatSuccess({ link: result.link })))
      }
    })
}
