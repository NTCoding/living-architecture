import { Command } from 'commander';
import { readFile } from 'node:fs/promises';
import { RiviereBuilder } from '@living-architecture/riviere-builder';
import { parseRiviereGraph } from '@living-architecture/riviere-schema';
import { resolveGraphPath, getDefaultGraphPathDescription } from '../../graph-path';
import { fileExists } from '../../file-existence';
import { formatError, formatSuccess } from '../../output';
import { CliErrorCode } from '../../error-codes';

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
}
