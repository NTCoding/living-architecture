import { Command } from 'commander'
import {
  formatError, formatSuccess 
} from '../../../platform/infra/cli/presentation/output'
import { CliErrorCode } from '../../../platform/infra/cli/presentation/error-codes'
import { getDefaultGraphPathDescription } from '../../../platform/infra/cli/presentation/graph-path-option'
import {
  isValidSystemType,
  VALID_SYSTEM_TYPES,
} from '../../../platform/infra/cli/input/component-types'
import type { AddDomain } from '../commands/add-domain'

interface AddDomainOptions {
  name: string
  description: string
  systemType: string
  graph?: string
  json?: boolean
}

/** @riviere-role cli-entrypoint */
export function createAddDomainCommand(addDomain: AddDomain): Command {
  return new Command('add-domain')
    .description('Add a domain to the graph')
    .addHelpText(
      'after',
      `
Examples:
  $ riviere builder add-domain --name orders --system-type domain \\
      --description "Order management"

  $ riviere builder add-domain --name checkout-bff --system-type bff \\
      --description "Checkout backend-for-frontend"
`,
    )
    .requiredOption('--name <name>', 'Domain name')
    .requiredOption('--description <description>', 'Domain description')
    .requiredOption('--system-type <type>', 'System type (domain, bff, ui, other)')
    .option('--graph <path>', getDefaultGraphPathDescription())
    .option('--json', 'Output result as JSON')
    .action(async (options: AddDomainOptions) => {
      if (!isValidSystemType(options.systemType)) {
        console.log(
          JSON.stringify(
            formatError(
              CliErrorCode.ValidationError,
              `Invalid system type: ${options.systemType}`,
              [`Valid types: ${VALID_SYSTEM_TYPES.join(', ')}`],
            ),
          ),
        )
        return
      }
      const result = addDomain.execute({
        description: options.description,
        graphPathOption: options.graph,
        name: options.name,
        systemType: options.systemType,
      })
      if (!result.success) {
        const errorCodeByResult = {
          DUPLICATE_DOMAIN: CliErrorCode.DuplicateDomain,
          GRAPH_NOT_FOUND: CliErrorCode.GraphNotFound,
          GRAPH_CORRUPTED: CliErrorCode.GraphCorrupted,
        } as const
        const errorCode = errorCodeByResult[result.code]
        const suggestions: string[] = []
        if (result.code === 'DUPLICATE_DOMAIN') {
          suggestions.push('Use a different domain name')
        }

        console.log(JSON.stringify(formatError(errorCode, result.message, suggestions)))
        return
      }

      if (options.json === true) {
        console.log(JSON.stringify(formatSuccess(result)))
      }
    })
}
