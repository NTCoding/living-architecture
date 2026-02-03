import { Command } from 'commander'
import { writeFile } from 'node:fs/promises'
import { ComponentId } from '@living-architecture/riviere-builder'
import {
  getDefaultGraphPathDescription,
  resolveGraphPath,
} from '../../../platform/infra/graph-persistence/graph-path'
import { fileExists } from '../../../platform/infra/graph-persistence/file-existence'
import { formatSuccess } from '../../../platform/infra/cli-presentation/output'
import {
  isValidLinkType,
  normalizeComponentType,
} from '../../../platform/infra/cli-presentation/component-types'
import { isValidHttpMethod } from '../../../platform/infra/cli-presentation/validation'
import {
  loadGraphBuilder,
  reportGraphNotFound,
} from '../../../platform/infra/graph-persistence/builder-graph-loader'
import {
  findApisByPath, getAllApiPaths 
} from '../queries/api-component-queries'
import {
  reportNoApiFoundForPath,
  reportAmbiguousApiMatch,
} from '../../../platform/infra/cli-presentation/link-http-errors'
import { validateOptions } from '../../../platform/infra/cli-presentation/link-http-validator'

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

export function createLinkHttpCommand(): Command {
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

      const graphPath = resolveGraphPath(options.graph)
      const graphExists = await fileExists(graphPath)

      if (!graphExists) {
        reportGraphNotFound(graphPath)
        return
      }

      const builder = await loadGraphBuilder(graphPath)
      const graph = builder.build()

      const normalizedMethod = options.method?.toUpperCase()
      const httpMethod =
        normalizedMethod && isValidHttpMethod(normalizedMethod) ? normalizedMethod : undefined
      const matchingApis = findApisByPath(graph, options.path, httpMethod)

      const [matchedApi, ...otherApis] = matchingApis

      if (!matchedApi) {
        reportNoApiFoundForPath(options.path, getAllApiPaths(graph))
        return
      }

      if (otherApis.length > 0) {
        reportAmbiguousApiMatch(options.path, matchingApis)
        return
      }

      const targetId = ComponentId.create({
        domain: options.toDomain,
        module: options.toModule,
        type: normalizeComponentType(options.toType),
        name: options.toName,
      }).toString()

      const linkInput: {
        from: string
        to: string
        type?: 'sync' | 'async'
      } = {
        from: matchedApi.id,
        to: targetId,
      }

      if (options.linkType !== undefined && isValidLinkType(options.linkType)) {
        linkInput.type = options.linkType
      }

      const link = builder.link(linkInput)

      await writeFile(graphPath, builder.serialize(), 'utf-8')

      if (options.json) {
        console.log(
          JSON.stringify(
            formatSuccess({
              link,
              matchedApi: {
                id: matchedApi.id,
                path: matchedApi.path,
                method: matchedApi.httpMethod,
              },
            }),
          ),
        )
      }
    })
}
