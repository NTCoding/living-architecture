import { Command } from 'commander'
import { CliErrorCode } from '../../../../infra/cli/presentation/error-codes'
import { getDefaultGraphPathDescription } from '../../../../infra/cli/presentation/graph-path-option'
import { formatError, formatSuccess } from '../../../../infra/cli/presentation/output'
import type { AddSource } from '@living-architecture/riviere-extract-ts-use-cases/features/extract/commands/add-source'

interface AddSourceOptions {
  repository: string
  graph?: string
  json?: boolean
}

/** @riviere-role cli-entrypoint-dependencies */
export interface CreateAddSourceCommandEntrypointDependencies {
  readonly addSource: AddSource
  readonly defaultGraphFileLocation: string
  readonly getDefaultGraphPathDescription: typeof getDefaultGraphPathDescription
  readonly formatError: typeof formatError
  readonly formatSuccess: typeof formatSuccess
}

/** @riviere-role cli-entrypoint */
export function createAddSourceCommand(
  dependencies: CreateAddSourceCommandEntrypointDependencies,
): Command {
  const { addSource } = dependencies
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
    .option('--graph <path>', dependencies.getDefaultGraphPathDescription())
    .option('--json', 'Output result as JSON')
    .action(async (options: AddSourceOptions) => {
      const result = addSource.execute({
        graphFileLocation: options.graph ?? dependencies.defaultGraphFileLocation,
        repository: options.repository,
      })
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
          JSON.stringify(dependencies.formatSuccess({ repository: result.result.repository })),
        )
      }
    })
}
