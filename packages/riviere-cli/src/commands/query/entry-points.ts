import { Command } from 'commander'
import { formatSuccess } from '../../output'
import {
  withGraph, getDefaultGraphPathDescription 
} from './load-graph'

interface EntryPointsOptions {
  graph?: string
  json?: boolean
}

export function createEntryPointsCommand(): Command {
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
    .option('--graph <path>', getDefaultGraphPathDescription())
    .option('--json', 'Output result as JSON')
    .action(async (options: EntryPointsOptions) => {
      await withGraph(options.graph, (query) => {
        const entryPoints = query.entryPoints()

        if (options.json) {
          console.log(JSON.stringify(formatSuccess({ entryPoints })))
        }
      })
    })
}
