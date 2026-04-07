import { Command } from 'commander'
import { ComponentId } from '@living-architecture/riviere-builder'
import { getDefaultGraphPathDescription } from '../../../platform/infra/cli/presentation/graph-path-option'
import {
  formatError, formatSuccess 
} from '../../../platform/infra/cli/presentation/output'
import {
  isValidLinkType,
  normalizeComponentType,
} from '../../../platform/infra/cli/input/component-types'
import { isValidHttpMethod } from '../../../platform/infra/cli/input/validation'
import { validateOptions } from '../../../platform/infra/cli/input/link-http-validator'
import { CliErrorCode } from '../../../platform/infra/cli/presentation/error-codes'
import type { LinkHttp } from '../commands/link-http'

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

/** @riviere-role cli-entrypoint */
export function createLinkHttpCommand(linkHttp: LinkHttp): Command {
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
    .option('--graph <path>', getDefaultGraphPathDescription())
    .option('--json', 'Output result as JSON')
    .action(async (options: LinkHttpOptions) => {
      const validationError = validateOptions(options)
      if (validationError) {
        console.log(validationError)
        return
      }

      const normalizedMethod = options.method?.toUpperCase()
      const httpMethod =
        normalizedMethod !== undefined && isValidHttpMethod(normalizedMethod)
          ? normalizedMethod
          : undefined
      const linkType =
        options.linkType !== undefined && isValidLinkType(options.linkType)
          ? options.linkType
          : undefined

      const result = linkHttp.execute({
        graphPathOption: options.graph,
        httpMethod,
        linkType,
        path: options.path,
        targetId: ComponentId.create({
          domain: options.toDomain,
          module: options.toModule,
          type: normalizeComponentType(options.toType),
          name: options.toName,
        }).toString(),
      })
      if (!result.success) {
        const errorCodeByResult = {
          AMBIGUOUS_API_MATCH: CliErrorCode.AmbiguousApiMatch,
          COMPONENT_NOT_FOUND: CliErrorCode.ComponentNotFound,
          GRAPH_CORRUPTED: CliErrorCode.GraphCorrupted,
          GRAPH_NOT_FOUND: CliErrorCode.GraphNotFound,
          VALIDATION_ERROR: CliErrorCode.ValidationError,
        } as const
        const errorCode = errorCodeByResult[result.code]

        console.log(JSON.stringify(formatError(errorCode, result.message, result.suggestions)))
        return
      }

      if (options.json) {
        console.log(JSON.stringify(formatSuccess(result)))
      }
    })
}
