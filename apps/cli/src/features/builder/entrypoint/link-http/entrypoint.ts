import { Command } from 'commander'
import { getDefaultGraphPathDescription } from '../../../../infra/cli/presentation/graph-path-option'
import { formatError, formatSuccess } from '../../../../infra/cli/presentation/output'
import { CliErrorCode } from '../../../../infra/cli/presentation/error-codes'
import type { LinkHttp } from '@living-architecture/riviere-builder-use-cases/features/builder/commands/link-http'

interface LinkHttpOptions {
  path: string
  toDomain: string
  toModule: string
  toType: string
  toName: string
  method?: string
  linkType?: string
  graph?: string
  json?: boolean
}

/** @riviere-role cli-entrypoint-dependencies */
export interface CreateLinkHttpCommandEntrypointDependencies {
  readonly linkHttp: LinkHttp
  readonly getDefaultGraphPathDescription: typeof getDefaultGraphPathDescription
  readonly formatError: typeof formatError
  readonly formatSuccess: typeof formatSuccess
}

/** @riviere-role cli-entrypoint */
export function createLinkHttpCommand(
  dependencies: CreateLinkHttpCommandEntrypointDependencies,
): Command {
  const { linkHttp } = dependencies
  return new Command('link-http')
    .description('Find an API by HTTP path and link to a target component')
    .addHelpText(
      'after',
      `
Examples:
  $ riviere builder link-http \\
      --path "/orders" --method POST \\
      --to-domain orders --to-module checkout --to-type UseCase --to-name "place-order"

  $ riviere builder link-http \\
      --path "/users/{id}" --method GET \\
      --to-domain users --to-module queries --to-type UseCase --to-name "get-user" \\
      --link-type sync
`,
    )
    .requiredOption('--path <http-path>', 'HTTP path to match')
    .requiredOption('--to-domain <domain>', 'Target domain')
    .requiredOption('--to-module <module>', 'Target module')
    .requiredOption('--to-type <type>', 'Target component type')
    .requiredOption('--to-name <name>', 'Target component name')
    .option('--method <method>', 'Filter by HTTP method (GET, POST, PUT, PATCH, DELETE)')
    .option('--link-type <type>', 'Link type (sync, async)')
    .option('--graph <path>', dependencies.getDefaultGraphPathDescription())
    .option('--json', 'Output result as JSON')
    .action(async (options: LinkHttpOptions) => {
      const result = linkHttp.execute({
        graphPathOption: options.graph,
        httpMethod: options.method,
        linkType: options.linkType,
        path: options.path,
        targetDomain: options.toDomain,
        targetModule: options.toModule,
        targetName: options.toName,
        targetType: options.toType,
      })
      if (!result.result.success) {
        const errorCodeByResult = {
          AMBIGUOUS_API_MATCH: CliErrorCode.AmbiguousApiMatch,
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
        console.log(JSON.stringify(dependencies.formatSuccess(result.result)))
      }
    })
}
