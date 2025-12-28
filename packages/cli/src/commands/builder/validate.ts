import { Command } from 'commander';
import { readFile } from 'node:fs/promises';
import { RiviereBuilder } from '@living-architecture/riviere-builder';
import { parseRiviereGraph } from '@living-architecture/riviere-schema';
import { formatError, formatSuccess } from '../../output';
import { CliErrorCode } from '../../error-codes';
import { fileExists } from '../../file-existence';
import { resolveGraphPath, getDefaultGraphPathDescription } from '../../graph-path';

interface ValidateOptions {
  graph?: string;
  json?: boolean;
}

export function createValidateCommand(): Command {
  return new Command('validate')
    .description('Validate the graph for errors and warnings')
    .option('--graph <path>', getDefaultGraphPathDescription())
    .option('--json', 'Output result as JSON')
    .action(async (options: ValidateOptions) => {
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

      const validationResult = builder.validate();
      const warnings = builder.warnings();

      if (options.json === true) {
        console.log(
          JSON.stringify(
            formatSuccess({
              valid: validationResult.valid,
              errors: validationResult.errors,
              warnings,
            })
          )
        );
      }
    });
}
