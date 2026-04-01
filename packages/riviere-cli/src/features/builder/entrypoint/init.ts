import { Command } from 'commander'
import { RiviereBuilder } from '@living-architecture/riviere-builder'
import type { BuilderOptions } from '@living-architecture/riviere-builder'
import { formatError, formatSuccess } from '../../../platform/infra/cli/presentation/output'
import { CliErrorCode } from '../../../platform/infra/cli/presentation/error-codes'
import { initializeGraphBuilder } from '../../../platform/infra/graph-persistence/builder-graph-loader'
import { getDefaultGraphPathDescription } from '../../../platform/infra/cli/presentation/graph-path-option'
import { collectOption } from '../../../platform/infra/cli/presentation/option-collectors'
import { parseDomainJson } from '../../../platform/infra/cli/presentation/domain-input-parser'
import type { DomainInputParsed } from '../../../platform/infra/cli/presentation/domain-input-parser'

interface InitOptions {
  name?: string
  graph?: string
  json?: boolean
  source: string[]
  domain: DomainInputParsed[]
}

/** @riviere-role cli-entrypoint */
export function createInitCommand(): Command {
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
    .option('--graph <path>', getDefaultGraphPathDescription())
    .option('--json', 'Output result as JSON')
    .option('--source <url>', 'Source repository URL (repeatable)', collectOption, [])
    .option('--domain <json>', 'Domain as JSON (repeatable)', parseDomainJson, [])
    .action(async (options: InitOptions) => {
      // Validate required flags
      if (options.source.length === 0) {
        console.log(
          JSON.stringify(
            formatError(CliErrorCode.ValidationError, 'At least one source required', [
              'Add --source <url> flag',
            ]),
          ),
        )
        return
      }

      if (options.domain.length === 0) {
        console.log(
          JSON.stringify(
            formatError(CliErrorCode.ValidationError, 'At least one domain required', [
              'Add --domain <json> flag',
            ]),
          ),
        )
        return
      }

      const builderOptions: BuilderOptions = {
        sources: options.source.map((url) => ({ repository: url })),
        domains: {},
      }

      const domains: BuilderOptions['domains'] = {}
      for (const d of options.domain) {
        domains[d.name] = {
          description: d.description,
          systemType: d.systemType,
        }
      }
      builderOptions.domains = domains

      if (options.name !== undefined) {
        builderOptions.name = options.name
      }

      const builder = RiviereBuilder.new(builderOptions)
      const initialization = await initializeGraphBuilder(builder, options.graph)

      if (initialization.graphExists) {
        console.log(
          JSON.stringify(
            formatError(
              CliErrorCode.GraphExists,
              `Graph already exists at ${initialization.graphPath}`,
              ['Delete the file to reinitialize'],
            ),
          ),
        )
        return
      }

      if (options.json === true) {
        const domainNames = options.domain.map((d) => d.name)
        console.log(
          JSON.stringify(
            formatSuccess({
              path: initialization.graphPath,
              sources: options.source.length,
              domains: domainNames,
            }),
          ),
        )
      }
    })
}
