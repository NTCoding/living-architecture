import { Command } from 'commander'
import {
  formatError, formatSuccess 
} from '../../../platform/infra/cli/presentation/output'
import { CliErrorCode } from '../../../platform/infra/cli/presentation/error-codes'
import { getDefaultGraphPathDescription } from '../../../platform/infra/cli/presentation/graph-path-option'
import { collectOption } from '../../../platform/infra/cli/input/option-collectors'
import { parseDomainJson } from '../../../platform/infra/cli/input/domain-input-parser'
import type { InitGraph } from '../commands/init-graph'

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
  systemType: 'domain' | 'bff' | 'ui' | 'other'
}

/** @riviere-role cli-entrypoint */
export function createInitCommand(initGraph: InitGraph): Command {
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

      const domains = options.domain.map(({
        description, name, systemType 
      }) => ({
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
            formatError(CliErrorCode.GraphExists, result.message, [
              'Delete the file to reinitialize',
            ]),
          ),
        )
        return
      }

      if (options.json === true) {
        console.log(
          JSON.stringify(
            formatSuccess({
              domains: result.domains,
              path: result.path,
              sources: result.sources,
            }),
          ),
        )
      }
    })
}
