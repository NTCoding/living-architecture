import { Command } from 'commander'
import { formatSuccess } from '../../output'
import {
  withGraph, getDefaultGraphPathDescription 
} from './load-graph'

interface DomainsOptions {
  graph?: string
  json?: boolean
}

export function createDomainsCommand(): Command {
  return new Command('domains')
    .description('List domains with component counts')
    .addHelpText(
      'after',
      `
Examples:
  $ riviere query domains
  $ riviere query domains --json
`,
    )
    .option('--graph <path>', getDefaultGraphPathDescription())
    .option('--json', 'Output result as JSON')
    .action(async (options: DomainsOptions) => {
      await withGraph(options.graph, (query) => {
        const domains = query.domains()

        if (options.json) {
          console.log(JSON.stringify(formatSuccess({ domains })))
        }
      })
    })
}
