import { Command } from 'commander'
import { getDefaultGraphPathDescription } from '../../graph-path'
import { formatSuccess } from '../../output'
import { withGraphBuilder } from './link-infrastructure'

interface ComponentSummaryOptions {graph?: string}

export function createComponentSummaryCommand(): Command {
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
    .option('--graph <path>', getDefaultGraphPathDescription())
    .action(async (options: ComponentSummaryOptions) => {
      await withGraphBuilder(options.graph, async (builder) => {
        const stats = builder.stats()
        console.log(JSON.stringify(formatSuccess(stats)))
      })
    })
}
