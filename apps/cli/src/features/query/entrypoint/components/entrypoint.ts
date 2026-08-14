import { Command } from 'commander'
import { formatSuccess, formatError } from '../../../../infra/cli/presentation/output'
import { CliErrorCode } from '../../../../infra/cli/presentation/error-codes'
import { formatQueryGraphLoadFailure } from '../../../../infra/cli/presentation/query-graph-load-failure-output'
import { getDefaultGraphPathDescription } from '../../../../infra/cli/presentation/graph-path-option'
import { toComponentOutput } from '../_platform/cli/component-output'
import type { ListComponents } from '@living-architecture/riviere-builder-use-cases/features/query/queries/list-components'

interface ComponentsOptions {
  graph?: string
  json?: boolean
  domain?: string
  type?: string
}

/** @riviere-role cli-entrypoint */
export function createComponentsCommand(listComponents: ListComponents): Command {
  return new Command('components')
    .description('List components with optional filtering')
    .addHelpText(
      'after',
      `
Examples:
  $ riviere query components
  $ riviere query components --domain orders
  $ riviere query components --type API --json
  $ riviere query components --domain orders --type UseCase
`,
    )
    .option('--graph <path>', getDefaultGraphPathDescription())
    .option('--json', 'Output result as JSON')
    .option('--domain <name>', 'Filter by domain name')
    .option('--type <type>', 'Filter by component type')
    .action(async (options: ComponentsOptions) => {
      const result = listComponents.execute({
        domain: options.domain,
        graphPathOption: options.graph,
        type: options.type,
      })

      if ('kind' in result) {
        if (result.kind === 'invalidComponentType' && options.json !== true) {
          console.error(`Error: ${result.message}`)
          return
        }
        console.log(
          JSON.stringify(
            result.kind === 'invalidComponentType'
              ? formatError(CliErrorCode.ValidationError, result.message)
              : formatQueryGraphLoadFailure(result),
          ),
        )
        return
      }

      const components = result.components.map(toComponentOutput)

      if (options.json) {
        console.log(JSON.stringify(formatSuccess({ components })))
      }
    })
}
