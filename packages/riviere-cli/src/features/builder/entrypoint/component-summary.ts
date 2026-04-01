import { Command } from 'commander'
import { getDefaultGraphPathDescription } from '../../../platform/infra/cli/presentation/graph-path-option'
import { formatSuccess } from '../../../platform/infra/cli/presentation/output'
import { withGraphBuilder } from '../infra/persistence/builder-graph-access'

interface ComponentSummaryOptions {
  graph?: string
}

/** @riviere-role cli-entrypoint */
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
