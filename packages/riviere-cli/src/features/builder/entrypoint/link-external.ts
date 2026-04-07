import { Command } from 'commander'
import { getDefaultGraphPathDescription } from '../../../platform/infra/cli/presentation/graph-path-option'
import {
  formatError, formatSuccess 
} from '../../../platform/infra/cli/presentation/output'
import { CliErrorCode } from '../../../platform/infra/cli/presentation/error-codes'
import { isValidLinkType } from '../../../platform/infra/cli/input/component-types'
import { validateLinkType } from '../../../platform/infra/cli/input/validation'
import { buildExternalTarget } from '../../../platform/infra/cli/input/link-external-transformer'
import type { LinkExternal } from '../commands/link-external'

interface LinkExternalOptions {
  from: string
  targetName: string
  targetDomain?: string
  targetUrl?: string
  linkType?: string
  graph?: string
  json?: boolean
}

/** @riviere-role cli-entrypoint */
export function createLinkExternalCommand(linkExternal: LinkExternal): Command {
  return new Command('link-external')
    .description('Link a component to an external system')
    .addHelpText(
      'after',
      `
Examples:
  $ riviere builder link-external \\
      --from "payments:gateway:usecase:processpayment" \\
      --target-name "Stripe" \\
      --target-url "https://api.stripe.com" \\
      --link-type sync

  $ riviere builder link-external \\
      --from "shipping:tracking:usecase:updatetracking" \\
      --target-name "FedEx API" \\
      --target-domain "shipping" \\
      --link-type async
`,
    )
    .requiredOption('--from <component-id>', 'Source component ID')
    .requiredOption('--target-name <name>', 'External target name')
    .option('--target-domain <domain>', 'External target domain')
    .option('--target-url <url>', 'External target URL')
    .option('--link-type <type>', 'Link type (sync, async)')
    .option('--graph <path>', getDefaultGraphPathDescription())
    .option('--json', 'Output result as JSON')
    .action(async (options: LinkExternalOptions) => {
      const linkTypeValidation = validateLinkType(options.linkType)
      if (!linkTypeValidation.valid) {
        console.log(linkTypeValidation.errorJson)
        return
      }

      const linkType =
        options.linkType !== undefined && isValidLinkType(options.linkType)
          ? options.linkType
          : undefined

      const result = linkExternal.execute({
        from: options.from,
        graphPathOption: options.graph,
        target: buildExternalTarget(options),
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
        console.log(JSON.stringify(formatSuccess({ externalLink: result.externalLink })))
      }
    })
}
