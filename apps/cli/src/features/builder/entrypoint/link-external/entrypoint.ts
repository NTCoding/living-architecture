import { Command } from 'commander'
import { getDefaultGraphPathDescription } from '../../../../infra/cli/presentation/graph-path-option'
import { formatError, formatSuccess } from '../../../../infra/cli/presentation/output'
import { CliErrorCode } from '../../../../infra/cli/presentation/error-codes'
import type { LinkExternal } from '@living-architecture/riviere-extract-ts-use-cases/features/extract/commands/link-external'

interface LinkExternalOptions {
  from: string
  targetName: string
  targetDomain?: string
  targetUrl?: string
  linkType?: string
  graph?: string
  json?: boolean
}

/** @riviere-role cli-entrypoint-dependencies */
export interface CreateLinkExternalCommandEntrypointDependencies {
  readonly linkExternal: LinkExternal
  readonly defaultGraphFileLocation: string
  readonly getDefaultGraphPathDescription: typeof getDefaultGraphPathDescription
  readonly formatError: typeof formatError
  readonly formatSuccess: typeof formatSuccess
}

/** @riviere-role cli-entrypoint */
export function createLinkExternalCommand(
  dependencies: CreateLinkExternalCommandEntrypointDependencies,
): Command {
  const { linkExternal } = dependencies
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
    .option('--graph <path>', dependencies.getDefaultGraphPathDescription())
    .option('--json', 'Output result as JSON')
    .action(async (options: LinkExternalOptions) => {
      const result = linkExternal.execute({
        from: options.from,
        graphFileLocation: options.graph ?? dependencies.defaultGraphFileLocation,
        targetDomain: options.targetDomain,
        targetName: options.targetName,
        targetUrl: options.targetUrl,
        type: options.linkType,
      })
      if (!result.result.success) {
        const errorCodeByResult = {
          COMPONENT_NOT_FOUND: CliErrorCode.ComponentNotFound,
          GRAPH_CORRUPTED: CliErrorCode.GraphCorrupted,
          GRAPH_NOT_FOUND: CliErrorCode.GraphNotFound,
          VALIDATION_ERROR: CliErrorCode.ValidationError,
        } as const
        const errorCode = errorCodeByResult[result.result.code]

        console.log(
          JSON.stringify(
            dependencies.formatError(errorCode, result.result.message, result.result.suggestions),
          ),
        )
        return
      }

      if (options.json) {
        console.log(
          JSON.stringify(dependencies.formatSuccess({ externalLink: result.result.externalLink })),
        )
      }
    })
}
