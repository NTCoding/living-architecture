import { Command } from 'commander'
import { CliErrorCode } from '../../../../infra/cli/presentation/error-codes'
import { getDefaultGraphPathDescription } from '../../../../infra/cli/presentation/graph-path-option'
import { formatError, formatSuccess } from '../../../../infra/cli/presentation/output'
import type { ComponentSummary } from '@living-architecture/riviere-builder-use-cases/features/builder/commands/component-summary'

interface ComponentSummaryOptions {
  graph?: string
}

/** @riviere-role cli-entrypoint-dependencies */
export interface CreateComponentSummaryCommandEntrypointDependencies {
  readonly componentSummary: ComponentSummary
  readonly defaultGraphFileLocation: string
  readonly getDefaultGraphPathDescription: typeof getDefaultGraphPathDescription
  readonly formatError: typeof formatError
  readonly formatSuccess: typeof formatSuccess
}

/** @riviere-role cli-entrypoint */
export function createComponentSummaryCommand(
  dependencies: CreateComponentSummaryCommandEntrypointDependencies,
): Command {
  const { componentSummary } = dependencies
  return new Command('component-summary')
    .description('Show component counts by type and domain')
    .addHelpText(
      'after',
      `
Examples:
  $ riviere builder component-summary
  $ riviere builder component-summary > summary.json
`,
    )
    .option('--graph <path>', dependencies.getDefaultGraphPathDescription())
    .action(async (options: ComponentSummaryOptions) => {
      const result = componentSummary.execute({ graphFileLocation: options.graph ?? dependencies.defaultGraphFileLocation })
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

      console.log(JSON.stringify(dependencies.formatSuccess(result.result.stats)))
    })
}
