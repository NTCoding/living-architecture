import { Command } from 'commander'
import { formatError, formatSuccess } from '../../../../infra/cli/presentation/output'
import { CliErrorCode } from '../../../../infra/cli/presentation/error-codes'
import { getDefaultGraphPathDescription } from '../../../../infra/cli/presentation/graph-path-option'
import type { AddDomain } from '@living-architecture/riviere-builder-use-cases/features/builder/commands/add-domain'

interface AddDomainOptions {
  name: string
  description: string
  systemType: string
  graph?: string
  json?: boolean
}

/** @riviere-role cli-entrypoint-dependencies */
export interface CreateAddDomainCommandEntrypointDependencies {
  readonly addDomain: AddDomain
  readonly getDefaultGraphPathDescription: typeof getDefaultGraphPathDescription
  readonly formatError: typeof formatError
  readonly formatSuccess: typeof formatSuccess
}

/** @riviere-role cli-entrypoint */
export function createAddDomainCommand(
  dependencies: CreateAddDomainCommandEntrypointDependencies,
): Command {
  const { addDomain } = dependencies
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
    .requiredOption(
      '--system-type <type>',
      'System type (domain, bff, ui, external-service, other)',
    )
    .option('--graph <path>', dependencies.getDefaultGraphPathDescription())
    .option('--json', 'Output result as JSON')
    .action(async (options: AddDomainOptions) => {
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
          VALIDATION_ERROR: CliErrorCode.ValidationError,
        } as const
        const errorCode = errorCodeByResult[result.code]
        const suggestions: string[] = []
        if (result.code === 'DUPLICATE_DOMAIN') {
          suggestions.push('Use a different domain name')
        }

        console.log(
          JSON.stringify(dependencies.formatError(errorCode, result.message, suggestions)),
        )
        return
      }

      if (options.json === true) {
        console.log(JSON.stringify(dependencies.formatSuccess(result)))
      }
    })
}
