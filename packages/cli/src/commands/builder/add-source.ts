import { Command } from 'commander';
import { readFile, writeFile } from 'node:fs/promises';
import { RiviereBuilder } from '@living-architecture/riviere-builder';
import { parseRiviereGraph } from '@living-architecture/riviere-schema';
import { formatError, formatSuccess } from '../../output';
import { CliErrorCode } from '../../error-codes';
import { fileExists } from '../../file-existence';
import { resolveGraphPath, getDefaultGraphPathDescription } from '../../graph-path';

interface AddSourceOptions {
  repository: string;
  graph?: string;
  json?: boolean;
}

export function createAddSourceCommand(): Command {
  return new Command('add-source')
    .description('Add a source repository to the graph')
    .requiredOption('--repository <url>', 'Source repository URL')
    .option('--graph <path>', getDefaultGraphPathDescription())
    .option('--json', 'Output result as JSON')
    .action(async (options: AddSourceOptions) => {
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

      builder.addSource({ repository: options.repository });

      await writeFile(graphPath, builder.serialize(), 'utf-8');

      if (options.json === true) {
        console.log(
          JSON.stringify(
            formatSuccess({
              repository: options.repository,
            })
          )
        );
      }
    });
}
