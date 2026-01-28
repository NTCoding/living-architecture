import { Command } from 'commander'
import { getDefaultGraphPathDescription } from '../../../platform/infra/graph-persistence/graph-path'
import { formatSuccess } from '../../../platform/infra/cli-presentation/output'
import { withGraphBuilder } from '../commands/link-infrastructure'

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
