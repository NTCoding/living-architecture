import { Command } from 'commander';
import { readFile } from 'node:fs/promises';
import { RiviereQuery } from '@living-architecture/riviere-query';
import { resolveGraphPath, getDefaultGraphPathDescription } from '../../graph-path';
import { fileExists } from '../../file-existence';
import { formatError, formatSuccess } from '../../output';
import { CliErrorCode } from '../../error-codes';

interface EntryPointsOptions {
  graph?: string;
  json?: boolean;
}

export function createEntryPointsCommand(): Command {
  return new Command('entry-points')
    .description('List entry points (APIs, UIs, EventHandlers with no incoming links)')
    .option('--graph <path>', getDefaultGraphPathDescription())
    .option('--json', 'Output result as JSON')
    .action(async (options: EntryPointsOptions) => {
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
      const query = RiviereQuery.fromJSON(parsed);
      const entryPoints = query.entryPoints();

      if (options.json === true) {
        console.log(JSON.stringify(formatSuccess({ entryPoints })));
      }
    });
}
