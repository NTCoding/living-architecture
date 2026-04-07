import { Command } from 'commander'
import { writeFile } from 'node:fs/promises'
import {
  formatError, formatSuccess 
} from '../../../platform/infra/cli/presentation/output'
import { CliErrorCode } from '../../../platform/infra/cli/presentation/error-codes'
import { getDefaultGraphPathDescription } from '../../../platform/infra/cli/presentation/graph-path-option'
import type { FinalizeGraph } from '../commands/finalize-graph'

interface FinalizeOptions {
  graph?: string
  output?: string
  json?: boolean
}

/** @riviere-role cli-entrypoint */
export function createFinalizeCommand(finalizeGraph: FinalizeGraph): Command {
  return new Command('finalize')
    .description('Validate and export the final graph')
    .addHelpText(
      'after',
      `
Examples:
  $ riviere builder finalize
  $ riviere builder finalize --output ./dist/architecture.json
  $ riviere builder finalize --json
`,
    )
    .option('--graph <path>', getDefaultGraphPathDescription())
    .option('--output <path>', 'Output path for finalized graph (defaults to input path)')
    .option('--json', 'Output result as JSON')
    .action(async (options: FinalizeOptions) => {
      const result = finalizeGraph.execute({ graphPathOption: options.graph })
      if (!result.success) {
        const errorCodeByResult = {
          GRAPH_CORRUPTED: CliErrorCode.GraphCorrupted,
          GRAPH_NOT_FOUND: CliErrorCode.GraphNotFound,
          VALIDATION_ERROR: CliErrorCode.ValidationError,
        } as const
        const errorCode = errorCodeByResult[result.code]
        const suggestions =
          result.code === 'VALIDATION_ERROR' ? ['Fix the validation errors and try again'] : []

        console.log(JSON.stringify(formatError(errorCode, result.message, suggestions)))
        return
      }

      const outputPath = options.output ?? options.graph ?? '.riviere/graph.json'
      await writeFile(outputPath, JSON.stringify(result.finalGraph, null, 2), 'utf-8')

      if (options.json === true) {
        console.log(JSON.stringify(formatSuccess({ path: outputPath })))
      }
    })
}
