import { Command } from 'commander'
import { CliErrorCode } from '../../../platform/infra/cli/presentation/error-codes'
import { getDefaultGraphPathDescription } from '../../../platform/infra/cli/presentation/graph-path-option'
import {
  formatError, formatSuccess 
} from '../../../platform/infra/cli/presentation/output'
import type { AddSource } from '../commands/add-source'

interface AddSourceOptions {
  repository: string
  graph?: string
  json?: boolean
}

/** @riviere-role cli-entrypoint */
export function createAddSourceCommand(addSource: AddSource): Command {
  return new Command('add-source')
    .description('Add a source repository to the graph')
    .addHelpText(
      'after',
      `
Examples:
  $ riviere builder add-source --repository https://github.com/your-org/orders-service
  $ riviere builder add-source --repository https://github.com/your-org/payments-api --json
`,
    )
    .requiredOption('--repository <url>', 'Source repository URL')
    .option('--graph <path>', getDefaultGraphPathDescription())
    .option('--json', 'Output result as JSON')
    .action(async (options: AddSourceOptions) => {
      const result = addSource.execute({
        graphPathOption: options.graph,
        repository: options.repository,
      })
      if (!result.success) {
        console.log(
          JSON.stringify(
            formatError(
              result.code === 'GRAPH_NOT_FOUND'
                ? CliErrorCode.GraphNotFound
                : CliErrorCode.GraphCorrupted,
              result.message,
              [],
            ),
          ),
        )
        return
      }

      if (options.json === true) {
        console.log(JSON.stringify(formatSuccess({ repository: result.repository })))
      }
    })
}
