import { Command } from 'commander';
import { getDefaultGraphPathDescription } from '../../graph-path';
import { formatSuccess } from '../../output';
import { withGraphBuilder } from './link-infrastructure';

interface CheckConsistencyOptions {
  graph?: string;
  json?: boolean;
}

export function createCheckConsistencyCommand(): Command {
  return new Command('check-consistency')
    .description('Check for structural issues in the graph')
    .option('--graph <path>', getDefaultGraphPathDescription())
    .option('--json', 'Output result as JSON')
    .action(async (options: CheckConsistencyOptions) => {
      await withGraphBuilder(options.graph, async (builder) => {
        const warnings = builder.warnings();
        const consistent = warnings.length === 0;

        if (options.json === true) {
          console.log(
            JSON.stringify(
              formatSuccess({
                consistent,
                warnings,
              })
            )
          );
        }
      });
    });
}
