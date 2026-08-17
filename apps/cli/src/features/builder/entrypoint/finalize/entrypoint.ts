import { Command } from 'commander'
import { formatError, formatSuccess } from '../../../../infra/cli/presentation/output'
import { CliErrorCode } from '../../../../infra/cli/presentation/error-codes'
import { getDefaultGraphPathDescription } from '../../../../infra/cli/presentation/graph-path-option'
import type { FinalizeGraph } from '@living-architecture/riviere-builder-use-cases/features/builder/commands/finalize-graph'

interface FinalizeOptions {
  graph?: string
  output?: string
  json?: boolean
}

type WriteUtf8File = (filePath: string, contents: string) => Promise<void>

/** @riviere-role cli-entrypoint-dependencies */
export interface CreateFinalizeCommandEntrypointDependencies {
  readonly finalizeGraph: FinalizeGraph
  readonly getDefaultGraphPathDescription: typeof getDefaultGraphPathDescription
  readonly formatError: typeof formatError
  readonly writeUtf8File: WriteUtf8File
  readonly formatSuccess: typeof formatSuccess
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

        console.log(
          JSON.stringify(dependencies.formatError(errorCode, result.message, suggestions)),
        )
        return
      }

      const outputPath = options.output ?? options.graph ?? '.riviere/graph.json'
      await dependencies.writeUtf8File(outputPath, JSON.stringify(result.finalGraph, null, 2))

      if (options.json === true) {
        console.log(JSON.stringify(dependencies.formatSuccess({ path: outputPath })))
      }
    })
}
