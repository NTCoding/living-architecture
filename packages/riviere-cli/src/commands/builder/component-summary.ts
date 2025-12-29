import { Command } from 'commander';
import { getDefaultGraphPathDescription } from '../../graph-path';
import { formatSuccess } from '../../output';
import { withGraphBuilder } from './link-infrastructure';

interface ComponentSummaryOptions {
  graph?: string;
  json?: boolean;
}

export function createComponentSummaryCommand(): Command {
  return new Command('component-summary')
    .description('Show component counts by type and domain')
    .addHelpText(
      'after',
      `
Examples:
  $ riviere builder component-summary
  $ riviere builder component-summary --json
`
    )
    .option('--graph <path>', getDefaultGraphPathDescription())
    .option('--json', 'Output result as JSON')
    .action(async (options: ComponentSummaryOptions) => {
      await withGraphBuilder(options.graph, async (builder) => {
        const stats = builder.stats();

        if (options.json === true) {
          console.log(JSON.stringify(formatSuccess(stats)));
        }
      });
    });
}
