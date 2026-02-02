import { Command } from 'commander'
import { formatSuccess } from '../../../platform/infra/cli-presentation/output'
import {
  withGraph,
  getDefaultGraphPathDescription,
} from '../../../platform/infra/graph-persistence/query-graph-loader'
import { toComponentOutput } from '../../../platform/infra/cli-presentation/component-output'

interface SearchOptions {
  graph?: string
  json?: boolean
}

export function createSearchCommand(): Command {
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
      await withGraph(options.graph, (query) => {
        const result = query.search(term)
        const components = result.map(toComponentOutput)

        if (options.json) {
          console.log(JSON.stringify(formatSuccess({ components })))
        }
      })
    })
}
