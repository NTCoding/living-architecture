import { Command } from 'commander';
import { writeFile } from 'node:fs/promises';
import { formatSuccess } from '../../output';
import { getDefaultGraphPathDescription } from '../../graph-path';
import { withGraphBuilder } from './link-infrastructure';

interface AddSourceOptions {
  repository: string;
  graph?: string;
  json?: boolean;
}

export function createAddSourceCommand(): Command {
  return new Command('add-source')
    .description('Add a source repository to the graph')
    .addHelpText(
      'after',
      `
Examples:
  $ riviere builder add-source --repository https://github.com/your-org/orders-service
  $ riviere builder add-source --repository https://github.com/your-org/payments-api --json
`,
    )
    .requiredOption('--repository <url>', 'Source repository URL')
    .option('--graph <path>', getDefaultGraphPathDescription())
    .option('--json', 'Output result as JSON')
    .action(async (options: AddSourceOptions) => {
      await withGraphBuilder(options.graph, async (builder, graphPath) => {
        builder.addSource({ repository: options.repository });

        await writeFile(graphPath, builder.serialize(), 'utf-8');

        if (options.json === true) {
          console.log(
            JSON.stringify(
              formatSuccess({repository: options.repository,}),
            ),
          );
        }
      });
    });
}
