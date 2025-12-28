import { Command } from 'commander';
import { readFile, writeFile } from 'node:fs/promises';
import { RiviereBuilder } from '@living-architecture/riviere-builder';
import { parseRiviereGraph } from '@living-architecture/riviere-schema';
import { formatError, formatSuccess } from '../../output';
import { CliErrorCode } from '../../error-codes';
import { fileExists } from '../../file-existence';
import { resolveGraphPath, getDefaultGraphPathDescription } from '../../graph-path';

interface FinalizeOptions {
  graph?: string;
  output?: string;
  json?: boolean;
}

export function createFinalizeCommand(): Command {
  return new Command('finalize')
    .description('Validate and export the final graph')
    .option('--graph <path>', getDefaultGraphPathDescription())
    .option('--output <path>', 'Output path for finalized graph (defaults to input path)')
    .option('--json', 'Output result as JSON')
    .action(async (options: FinalizeOptions) => {
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

      if (!validationResult.valid) {
        const messages = validationResult.errors.map((e) => e.message).join('; ');
        console.log(
          JSON.stringify(
            formatError(CliErrorCode.ValidationError, `Validation failed: ${messages}`, [
              'Fix the validation errors and try again',
            ])
          )
        );
        return;
      }

      const outputPath = options.output ?? graphPath;
      const finalGraph = builder.build();
      await writeFile(outputPath, JSON.stringify(finalGraph, null, 2), 'utf-8');

      if (options.json === true) {
        console.log(JSON.stringify(formatSuccess({ path: outputPath })));
      }
    });
}
