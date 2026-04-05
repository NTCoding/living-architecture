import { Command } from 'commander'
import {
  formatError, formatSuccess 
} from '../../../platform/infra/cli/presentation/output'
import { CliErrorCode } from '../../../platform/infra/cli/presentation/error-codes'
import { getDefaultGraphPathDescription } from '../../../platform/infra/cli/presentation/graph-path-option'
import { handleQueryGraphLoadError } from '../../../platform/infra/cli/presentation/query-graph-load-error-handler'
import { traceFlow } from '../commands/trace-flow'

interface TraceOptions {
  graph?: string
  json?: boolean
}

/** @riviere-role cli-entrypoint */
export function createTraceCommand(): Command {
  return new Command('trace')
    .description('Trace flow from a component (bidirectional)')
    .addHelpText(
      'after',
      `
Examples:
  $ riviere query trace "orders:api:api:postorders"
  $ riviere query trace "orders:checkout:usecase:placeorder" --json
`,
    )
    .argument('<componentId>', 'Component ID to trace from')
    .option('--graph <path>', getDefaultGraphPathDescription())
    .option('--json', 'Output result as JSON')
    .action(async (componentIdArg: string, options: TraceOptions) => {
      try {
        const result = await traceFlow({
          componentId: componentIdArg,
          graphPathOption: options.graph,
        })

        if (!result.success) {
          console.log(
            JSON.stringify(
              formatError(CliErrorCode.ComponentNotFound, result.message, result.suggestions),
            ),
          )
          return
        }

        if (options.json) {
          console.log(JSON.stringify(formatSuccess(result.flow)))
        }
      } catch (error) {
        if (!handleQueryGraphLoadError(error)) {
          throw error
        }
      }
    })
}
