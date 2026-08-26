import { Command } from 'commander'
import { CliErrorCode } from '../../../../infra/cli/presentation/error-codes'
import { getDefaultGraphPathDescription } from '../../../../infra/cli/presentation/graph-path-option'
import { formatError, formatSuccess } from '../../../../infra/cli/presentation/output'
import type { ValidateGraph } from '@living-architecture/riviere-builder-use-cases/features/builder/commands/validate-graph'

interface ValidateOptions {
  graph?: string
  json?: boolean
}

/** @riviere-role cli-entrypoint-dependencies */
export interface CreateValidateCommandEntrypointDependencies {
  readonly validateGraph: ValidateGraph
  readonly defaultGraphFileLocation: string
  readonly getDefaultGraphPathDescription: typeof getDefaultGraphPathDescription
  readonly formatError: typeof formatError
  readonly formatSuccess: typeof formatSuccess
}

/** @riviere-role cli-entrypoint */
export function createValidateCommand(
  dependencies: CreateValidateCommandEntrypointDependencies,
): Command {
  const { validateGraph } = dependencies
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
    .option('--graph <path>', dependencies.getDefaultGraphPathDescription())
    .option('--json', 'Output result as JSON')
    .action(async (options: ValidateOptions) => {
      const result = validateGraph.execute({ graphFileLocation: options.graph ?? dependencies.defaultGraphFileLocation })
      if (!result.result.success) {
        console.log(
          JSON.stringify(
            dependencies.formatError(
              result.result.code === 'GRAPH_NOT_FOUND'
                ? CliErrorCode.GraphNotFound
                : CliErrorCode.GraphCorrupted,
              result.result.message,
              [],
            ),
          ),
        )
        return
      }

      if (options.json === true) {
        console.log(
          JSON.stringify(
            dependencies.formatSuccess({
              errors: result.result.errors,
              valid: result.result.valid,
              warnings: result.result.warnings,
            }),
          ),
        )
      }
    })
}
