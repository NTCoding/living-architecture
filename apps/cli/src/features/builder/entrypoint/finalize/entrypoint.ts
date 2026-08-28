import { Command } from 'commander'
import { formatError, formatSuccess } from '../../../../infra/cli/presentation/output'
import { CliErrorCode } from '../../../../infra/cli/presentation/error-codes'
import { getDefaultGraphPathDescription } from '../../../../infra/cli/presentation/graph-path-option'
import type { FinalizeGraph } from '@living-architecture/riviere-extract-ts-use-cases/features/extract/commands/finalize-graph'
import { createFinalizeGraphInput } from './create-finalize-graph-input'
import { writeFinalizedGraph } from './write-finalized-graph'

interface FinalizeOptions {
  graph?: string
  output?: string
  json?: boolean
}

/** @riviere-role cli-entrypoint-dependencies */
export interface CreateFinalizeCommandEntrypointDependencies {
  readonly createFinalizeGraphInput: typeof createFinalizeGraphInput
  readonly finalizeGraph: FinalizeGraph
  readonly defaultGraphFileLocation: string
  readonly getDefaultGraphPathDescription: typeof getDefaultGraphPathDescription
  readonly formatError: typeof formatError
  readonly formatSuccess: typeof formatSuccess
  readonly writeFinalizedGraph: typeof writeFinalizedGraph
}

/** @riviere-role cli-entrypoint */
export function createFinalizeCommand(
  dependencies: CreateFinalizeCommandEntrypointDependencies,
): Command {
  const { finalizeGraph } = dependencies
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
    .option('--graph <path>', dependencies.getDefaultGraphPathDescription())
    .option('--output <path>', 'Output path for finalized graph (defaults to input path)')
    .option('--json', 'Output result as JSON')
    .action(async (options: FinalizeOptions) => {
      const result = finalizeGraph.execute(
        dependencies.createFinalizeGraphInput(options, dependencies.defaultGraphFileLocation),
      )
      if (!result.result.success) {
        const errorCodeByResult = {
          GRAPH_CORRUPTED: CliErrorCode.GraphCorrupted,
          GRAPH_NOT_FOUND: CliErrorCode.GraphNotFound,
          VALIDATION_ERROR: CliErrorCode.ValidationError,
        } as const
        const errorCode = errorCodeByResult[result.result.code]
        const suggestions =
          result.result.code === 'VALIDATION_ERROR'
            ? ['Fix the validation errors and try again']
            : []

        console.log(
          JSON.stringify(dependencies.formatError(errorCode, result.result.message, suggestions)),
        )
        return
      }

      await dependencies.writeFinalizedGraph(result)

      if (options.json === true) {
        console.log(JSON.stringify(dependencies.formatSuccess({ path: result.result.outputPath })))
      }
    })
}
