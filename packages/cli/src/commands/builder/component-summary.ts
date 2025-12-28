import { Command } from 'commander';
import { readFile } from 'node:fs/promises';
import { RiviereBuilder } from '@living-architecture/riviere-builder';
import { parseRiviereGraph } from '@living-architecture/riviere-schema';
import { resolveGraphPath, getDefaultGraphPathDescription } from '../../graph-path';
import { fileExists } from '../../file-existence';
import { formatError, formatSuccess } from '../../output';
import { CliErrorCode } from '../../error-codes';

interface ComponentSummaryOptions {
  graph?: string;
  json?: boolean;
}

export function createComponentSummaryCommand(): Command {
  return new Command('component-summary')
    .description('Show component counts by type and domain')
    .option('--graph <path>', getDefaultGraphPathDescription())
    .option('--json', 'Output result as JSON')
    .action(async (options: ComponentSummaryOptions) => {
      const graphPath = resolveGraphPath(options.graph);
      const graphExists = await fileExists(graphPath);

      if (!graphExists) {
        console.log(
          JSON.stringify(
            formatError(CliErrorCode.GraphNotFound, `Graph not found at ${graphPath}`, [
              'Run riviere builder init first',
            ])
          )
        );
        return;
      }

      const content = await readFile(graphPath, 'utf-8');
      const parsed: unknown = JSON.parse(content);
      const graph = parseRiviereGraph(parsed);
      const builder = RiviereBuilder.resume(graph);

      const stats = builder.stats();

      if (options.json === true) {
        console.log(JSON.stringify(formatSuccess(stats)));
      }
    });
}
