import { Command } from 'commander';
import { formatSuccess } from '../../output';
import {
 withGraph, getDefaultGraphPathDescription 
} from './load-graph';

interface OrphansOptions {
  graph?: string;
  json?: boolean;
}

export function createOrphansCommand(): Command {
  return new Command('orphans')
    .description('Find orphan components with no links')
    .addHelpText(
      'after',
      `
Examples:
  $ riviere query orphans
  $ riviere query orphans --json
`,
    )
    .option('--graph <path>', getDefaultGraphPathDescription())
    .option('--json', 'Output result as JSON')
    .action(async (options: OrphansOptions) => {
      await withGraph(options.graph, (query) => {
        const orphans = query.detectOrphans();

        if (options.json) {
          console.log(JSON.stringify(formatSuccess({ orphans })));
        }
      });
    });
}
