import { Command } from 'commander'
import { formatSuccess } from '../../../../infra/cli/presentation/output'
import { formatQueryGraphLoadFailure } from '../../../../infra/cli/presentation/query-graph-load-failure-output'
import { getDefaultGraphPathDescription } from '../../../../infra/cli/presentation/graph-path-option'
import type { ListEntryPoints } from '@living-architecture/riviere-builder-use-cases/features/query/queries/list-entry-points'

interface EntryPointsOptions {
  graph?: string
  json?: boolean
}

/** @riviere-role cli-entrypoint-dependencies */
export interface CreateEntryPointsCommandEntrypointDependencies {
  readonly listEntryPoints: ListEntryPoints
  readonly getDefaultGraphPathDescription: typeof getDefaultGraphPathDescription
  readonly formatQueryGraphLoadFailure: typeof formatQueryGraphLoadFailure
  readonly formatSuccess: typeof formatSuccess
}

/** @riviere-role cli-entrypoint */
export function createEntryPointsCommand(
  dependencies: CreateEntryPointsCommandEntrypointDependencies,
): Command {
  const { listEntryPoints } = dependencies
  return new Command('entry-points')
    .description('List entry points (APIs, UIs, EventHandlers with no incoming links)')
    .addHelpText(
      'after',
      `
Examples:
  $ riviere query entry-points
  $ riviere query entry-points --json
`,
    )
    .option('--graph <path>', dependencies.getDefaultGraphPathDescription())
    .option('--json', 'Output result as JSON')
    .action(async (options: EntryPointsOptions) => {
      const result = listEntryPoints.execute({ graphPathOption: options.graph })

      if ('kind' in result) {
        console.log(JSON.stringify(dependencies.formatQueryGraphLoadFailure(result)))
        return
      }

      if (options.json) {
        console.log(JSON.stringify(dependencies.formatSuccess(result)))
      }
    })
}
