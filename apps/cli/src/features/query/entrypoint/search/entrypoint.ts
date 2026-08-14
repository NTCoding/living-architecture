import { Command } from 'commander'
import { formatSuccess } from '../../../../infra/cli/presentation/output'
import { formatQueryGraphLoadFailure } from '../../../../infra/cli/presentation/query-graph-load-failure-output'
import { getDefaultGraphPathDescription } from '../../../../infra/cli/presentation/graph-path-option'
import { toComponentOutput } from '../_platform/cli/component-output'
import type { SearchComponents } from '@living-architecture/riviere-builder-use-cases/features/query/queries/search-components'

interface SearchOptions {
  graph?: string
  json?: boolean
}

/** @riviere-role cli-entrypoint */
export function createSearchCommand(searchComponents: SearchComponents): Command {
  return new Command('search')
    .description('Search components by name')
    .addHelpText(
      'after',
      `
Examples:
  $ riviere query search order
  $ riviere query search "place-order" --json
`,
    )
    .argument('<term>', 'Search term')
    .option('--graph <path>', getDefaultGraphPathDescription())
    .option('--json', 'Output result as JSON')
    .action(async (term: string, options: SearchOptions) => {
      const result = searchComponents.execute({
        graphPathOption: options.graph,
        term,
      })

      if ('kind' in result) {
        console.log(JSON.stringify(formatQueryGraphLoadFailure(result)))
        return
      }

      const components = result.components.map(toComponentOutput)

      if (options.json) {
        console.log(JSON.stringify(formatSuccess({ components })))
      }
    })
}
