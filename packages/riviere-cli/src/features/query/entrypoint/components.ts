import { Command } from 'commander'
import {
  formatSuccess, formatError 
} from '../../../platform/infra/cli/presentation/output'
import { CliErrorCode } from '../../../platform/infra/cli/presentation/error-codes'
import { getDefaultGraphPathDescription } from '../../../platform/infra/cli/presentation/graph-path-option'
import {
  isValidComponentType,
  normalizeToSchemaComponentType,
  VALID_COMPONENT_TYPES,
} from '../../../platform/infra/cli/input/component-types'
import { handleQueryGraphLoadError } from '../../../platform/infra/cli/presentation/query-graph-load-error-handler'
import { toComponentOutput } from '../../../platform/infra/cli/presentation/component-output'
import type { ListComponents } from '../queries/list-components'

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
      if (options.type !== undefined && !isValidComponentType(options.type)) {
        const errorMessage = `Invalid component type: ${options.type}. Valid types: ${VALID_COMPONENT_TYPES.join(', ')}`
        if (options.json) {
          console.log(JSON.stringify(formatError(CliErrorCode.ValidationError, errorMessage)))
        } else {
          console.error(`Error: ${errorMessage}`)
        }
        return
      }

      try {
        const result = listComponents.execute({
          domain: options.domain,
          graphPathOption: options.graph,
          type:
            options.type === undefined ? undefined : normalizeToSchemaComponentType(options.type),
        })

        const components = result.components.map(toComponentOutput)

        if (options.json) {
          console.log(JSON.stringify(formatSuccess({ components })))
        }
      } catch (error) {
        if (!handleQueryGraphLoadError(error)) {
          throw error
        }
      }
    })
}
