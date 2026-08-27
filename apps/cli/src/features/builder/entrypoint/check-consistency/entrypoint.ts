import { Command } from 'commander'
import { CliErrorCode } from '../../../../infra/cli/presentation/error-codes'
import { getDefaultGraphPathDescription } from '../../../../infra/cli/presentation/graph-path-option'
import { formatError, formatSuccess } from '../../../../infra/cli/presentation/output'
import type { CheckConsistency } from '@living-architecture/riviere-builder-use-cases/features/builder/commands/check-consistency'

interface CheckConsistencyOptions {
  graph?: string
  json?: boolean
}

/** @riviere-role cli-entrypoint-dependencies */
export interface CreateCheckConsistencyCommandEntrypointDependencies {
  readonly checkConsistency: CheckConsistency
  readonly defaultGraphFileLocation: string
  readonly getDefaultGraphPathDescription: typeof getDefaultGraphPathDescription
  readonly formatError: typeof formatError
  readonly formatSuccess: typeof formatSuccess
}

/** @riviere-role cli-entrypoint */
export function createCheckConsistencyCommand(
  dependencies: CreateCheckConsistencyCommandEntrypointDependencies,
): Command {
  const { checkConsistency } = dependencies
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
    .option('--graph <path>', dependencies.getDefaultGraphPathDescription())
    .option('--json', 'Output result as JSON')
    .action(async (options: CheckConsistencyOptions) => {
      const result = checkConsistency.execute({ graphFileLocation: options.graph ?? dependencies.defaultGraphFileLocation })
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
              consistent: result.result.consistent,
              warnings: result.result.warnings,
            }),
          ),
        )
      }
    })
}
