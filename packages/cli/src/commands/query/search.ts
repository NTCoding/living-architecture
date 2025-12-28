import { Command } from 'commander';
import { formatSuccess } from '../../output';
import { withGraph, getDefaultGraphPathDescription } from './load-graph';
import { toComponentOutput } from './component-output';

interface SearchOptions {
  graph?: string;
  json?: boolean;
}

export function createSearchCommand(): Command {
  return new Command('search')
    .description('Search components by name')
    .argument('<term>', 'Search term')
    .option('--graph <path>', getDefaultGraphPathDescription())
    .option('--json', 'Output result as JSON')
    .action(async (term: string, options: SearchOptions) => {
      await withGraph(options.graph, (query) => {
        const result = query.search(term);
        const components = result.map(toComponentOutput);

        if (options.json) {
          console.log(JSON.stringify(formatSuccess({ components })));
        }
      });
    });
}
