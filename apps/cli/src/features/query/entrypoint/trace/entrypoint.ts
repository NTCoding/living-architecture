import { Command } from 'commander'
import { formatError, formatSuccess } from '../../../../infra/cli/presentation/output'
import { CliErrorCode } from '../../../../infra/cli/presentation/error-codes'
import { formatQueryGraphLoadFailure } from '../../../../infra/cli/presentation/query-graph-load-failure-output'
import { getDefaultGraphPathDescription } from '../../../../infra/cli/presentation/graph-path-option'
import type { TraceFlow } from '@living-architecture/riviere-builder-use-cases/features/query/queries/trace-flow'

interface TraceOptions {
  graph?: string
  json?: boolean
}

/** @riviere-role cli-entrypoint */
export function createTraceCommand(traceFlow: TraceFlow): Command {
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
      const result = traceFlow.execute({
        componentId: componentIdArg,
        graphPathOption: options.graph,
      })

      if ('kind' in result) {
        console.log(JSON.stringify(formatQueryGraphLoadFailure(result)))
        return
      }

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
    })
}
