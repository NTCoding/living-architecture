import { Command } from 'commander';
import { writeFile } from 'node:fs/promises';
import {
 formatError, formatSuccess 
} from '../../output';
import { CliErrorCode } from '../../error-codes';
import { getDefaultGraphPathDescription } from '../../graph-path';
import { withGraphBuilder } from './link-infrastructure';

interface FinalizeOptions {
  graph?: string;
  output?: string;
  json?: boolean;
}

export function createFinalizeCommand(): Command {
  return new Command('finalize')
    .description('Validate and export the final graph')
    .addHelpText(
      'after',
      `
Examples:
  $ riviere builder finalize
  $ riviere builder finalize --output ./dist/architecture.json
  $ riviere builder finalize --json
`,
    )
    .option('--graph <path>', getDefaultGraphPathDescription())
    .option(
      '--output <path>',
      'Output path for finalized graph (defaults to input path)',
    )
    .option('--json', 'Output result as JSON')
    .action(async (options: FinalizeOptions) => {
      await withGraphBuilder(options.graph, async (builder, graphPath) => {
        const validationResult = builder.validate();

        if (!validationResult.valid) {
          const messages = validationResult.errors
            .map((e) => e.message)
            .join('; ');
          console.log(
            JSON.stringify(
              formatError(
                CliErrorCode.ValidationError,
                `Validation failed: ${messages}`,
                ['Fix the validation errors and try again'],
              ),
            ),
          );
          return;
        }

        const outputPath = options.output ?? graphPath;
        const finalGraph = builder.build();
        await writeFile(
          outputPath,
          JSON.stringify(finalGraph, null, 2),
          'utf-8',
        );

        if (options.json === true) {
          console.log(JSON.stringify(formatSuccess({ path: outputPath })));
        }
      });
    });
}
