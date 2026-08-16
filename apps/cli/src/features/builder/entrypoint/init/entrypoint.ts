import { Command } from 'commander'
import { formatError, formatSuccess } from '../../../../infra/cli/presentation/output'
import { CliErrorCode } from '../../../../infra/cli/presentation/error-codes'
import { getDefaultGraphPathDescription } from '../../../../infra/cli/presentation/graph-path-option'
import { collectOption } from '../_platform/cli/option-collectors'
import { parseDomainJson } from './domain-input-parser'
import type { InitGraph } from '@living-architecture/riviere-builder-use-cases/features/builder/commands/init-graph'

interface InitOptions {
  name?: string
  graph?: string
  json?: boolean
  source: string[]
  domain: DomainInputParsed[]
}

interface DomainInputParsed {
  description: string
  name: string
  systemType: string
}

/** @riviere-role cli-entrypoint-dependencies */
export interface CreateInitCommandEntrypointDependencies {
  readonly initGraph: InitGraph
  readonly getDefaultGraphPathDescription: typeof getDefaultGraphPathDescription
  readonly formatError: typeof formatError
  readonly formatSuccess: typeof formatSuccess
}

/** @riviere-role cli-entrypoint */
export function createInitCommand(dependencies: CreateInitCommandEntrypointDependencies): Command {
  const { initGraph } = dependencies
  return new Command('init')
    .description('Initialize a new graph')
    .addHelpText(
      'after',
      `
Examples:
  $ riviere builder init --source https://github.com/your-org/your-repo \\
      --domain '{"name":"orders","description":"Order management","systemType":"domain"}'

  $ riviere builder init --name "ecommerce" \\
      --source https://github.com/your-org/orders \\
      --source https://github.com/your-org/payments \\
      --domain '{"name":"orders","description":"Order management","systemType":"domain"}' \\
      --domain '{"name":"payments","description":"Payment processing","systemType":"domain"}'
`,
    )
    .option('--name <name>', 'System name')
    .option('--graph <path>', dependencies.getDefaultGraphPathDescription())
    .option('--json', 'Output result as JSON')
    .option('--source <url>', 'Source repository URL (repeatable)', collectOption, [])
    .option('--domain <json>', 'Domain as JSON (repeatable)', parseDomainJson, [])
    .action(async (options: InitOptions) => {
      // Validate required flags
      if (options.source.length === 0) {
        console.log(
          JSON.stringify(
            dependencies.formatError(CliErrorCode.ValidationError, 'At least one source required', [
              'Add --source <url> flag',
            ]),
          ),
        )
        return
      }

      if (options.domain.length === 0) {
        console.log(
          JSON.stringify(
            dependencies.formatError(CliErrorCode.ValidationError, 'At least one domain required', [
              'Add --domain <json> flag',
            ]),
          ),
        )
        return
      }

      const domains = options.domain.map(({ description, name, systemType }) => ({
        description,
        name,
        systemType,
      }))

      const result = initGraph.execute({
        domains,
        graphPathOption: options.graph,
        name: options.name,
        sources: options.source,
      })

      if (!result.success) {
        console.log(
          JSON.stringify(
            result.code === 'VALIDATION_ERROR'
              ? dependencies.formatError(CliErrorCode.ValidationError, result.message)
              : dependencies.formatError(CliErrorCode.GraphExists, result.message, [
                  'Delete the file to reinitialize',
                ]),
          ),
        )
        return
      }

      if (options.json === true) {
        console.log(
          JSON.stringify(
            dependencies.formatSuccess({
              domains: result.domains,
              path: result.path,
              sources: result.sources,
            }),
          ),
        )
      }
    })
}
