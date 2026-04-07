import { Command } from 'commander'
import { CliErrorCode } from '../../../platform/infra/cli/presentation/error-codes'
import { getDefaultGraphPathDescription } from '../../../platform/infra/cli/presentation/graph-path-option'
import {
  formatError, formatSuccess 
} from '../../../platform/infra/cli/presentation/output'
import type { CheckConsistency } from '../commands/check-consistency'

interface CheckConsistencyOptions {
  graph?: string
  json?: boolean
}

/** @riviere-role cli-entrypoint */
export function createCheckConsistencyCommand(checkConsistency: CheckConsistency): Command {
  return new Command('check-consistency')
    .description('Check for structural issues in the graph')
    .addHelpText(
      'after',
      `
Examples:
  $ riviere builder check-consistency
  $ riviere builder check-consistency --json
`,
    )
    .option('--graph <path>', getDefaultGraphPathDescription())
    .option('--json', 'Output result as JSON')
    .action(async (options: CheckConsistencyOptions) => {
      const result = checkConsistency.execute({ graphPathOption: options.graph })
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
        console.log(
          JSON.stringify(
            formatSuccess({
              consistent: result.consistent,
              warnings: result.warnings,
            }),
          ),
        )
      }
    })
}
