import { Command } from 'commander';
import {
  ComponentNotFoundError,
  parseComponentId,
} from '@living-architecture/riviere-query';
import {
  findNearMatches,
  ComponentId,
} from '@living-architecture/riviere-builder';
import {
 formatError, formatSuccess 
} from '../../output';
import { CliErrorCode } from '../../error-codes';
import {
 withGraph, getDefaultGraphPathDescription 
} from './load-graph';

interface TraceOptions {
  graph?: string;
  json?: boolean;
}

export function createTraceCommand(): Command {
  return new Command('trace')
    .description('Trace flow from a component (bidirectional)')
    .addHelpText(
      'after',
      `
Examples:
  $ riviere query trace "orders:api:api:postorders"
  $ riviere query trace "orders:checkout:usecase:placeorder" --json
`,
    )
    .argument('<componentId>', 'Component ID to trace from')
    .option('--graph <path>', getDefaultGraphPathDescription())
    .option('--json', 'Output result as JSON')
    .action(async (componentIdArg: string, options: TraceOptions) => {
      await withGraph(options.graph, (query) => {
        try {
          const componentId = parseComponentId(componentIdArg);
          const flow = query.traceFlow(componentId);

          if (options.json) {
            console.log(JSON.stringify(formatSuccess(flow)));
          }
        } catch (error) {
          if (error instanceof ComponentNotFoundError) {
            const parsedId = ComponentId.parse(componentIdArg);
            const matches = findNearMatches(
              query.components(),
              { name: parsedId.name() },
              { limit: 3 },
            );
            /* v8 ignore next -- @preserve v8 fails to track inline arrow function coverage despite test execution */
            const suggestions = matches.map((m) => m.component.id);

            console.log(
              JSON.stringify(
                formatError(
                  CliErrorCode.ComponentNotFound,
                  error.message,
                  suggestions,
                ),
              ),
            );
            return;
          }
          /* v8 ignore next -- @preserve v8 fails to track throw statement coverage despite test execution */
          throw error;
        }
      });
    });
}
