import { Command } from 'commander'
import { CliErrorCode } from '../../../platform/infra/cli/presentation/error-codes'
import { getDefaultGraphPathDescription } from '../../../platform/infra/cli/presentation/graph-path-option'
import {
  formatError, formatSuccess 
} from '../../../platform/infra/cli/presentation/output'
import type { ValidateGraph } from '../commands/validate-graph'

interface ValidateOptions {
  graph?: string
  json?: boolean
}

/** @riviere-role cli-entrypoint */
export function createValidateCommand(validateGraph: ValidateGraph): Command {
  return new Command('validate')
    .description('Validate the graph for errors and warnings')
    .addHelpText(
      'after',
      `
Examples:
  $ riviere builder validate
  $ riviere builder validate --json
  $ riviere builder validate --graph .riviere/my-graph.json
`,
    )
    .option('--graph <path>', getDefaultGraphPathDescription())
    .option('--json', 'Output result as JSON')
    .action(async (options: ValidateOptions) => {
      const result = validateGraph.execute({ graphPathOption: options.graph })
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
              errors: result.errors,
              valid: result.valid,
              warnings: result.warnings,
            }),
          ),
        )
      }
    })
}
