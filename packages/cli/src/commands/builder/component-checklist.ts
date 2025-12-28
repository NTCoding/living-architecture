import { Command } from 'commander';
import { readFile } from 'node:fs/promises';
import { RiviereBuilder } from '@living-architecture/riviere-builder';
import { parseRiviereGraph } from '@living-architecture/riviere-schema';
import { resolveGraphPath, getDefaultGraphPathDescription } from '../../graph-path';
import { fileExists } from '../../file-existence';
import { formatError, formatSuccess } from '../../output';
import { CliErrorCode } from '../../error-codes';
import { isValidComponentType } from '../../component-types';

interface ComponentChecklistOptions {
  graph?: string;
  json?: boolean;
  type?: string;
}

export function createComponentChecklistCommand(): Command {
  return new Command('component-checklist')
    .description('List components as a checklist for linking/enrichment')
    .option('--graph <path>', getDefaultGraphPathDescription())
    .option('--json', 'Output result as JSON')
    .option('--type <type>', 'Filter by component type')
    .action(async (options: ComponentChecklistOptions) => {
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

      if (options.type !== undefined && !isValidComponentType(options.type)) {
        console.log(
          JSON.stringify(
            formatError(CliErrorCode.InvalidComponentType, `Invalid component type: ${options.type}`, [
              'Valid types: UI, API, UseCase, DomainOp, Event, EventHandler, Custom',
            ])
          )
        );
        return;
      }

      const content = await readFile(graphPath, 'utf-8');
      const parsed: unknown = JSON.parse(content);
      const graph = parseRiviereGraph(parsed);
      const builder = RiviereBuilder.resume(graph);

      const allComponents = builder.query().components();
      const filteredComponents =
        options.type !== undefined ? allComponents.filter((c) => c.type === options.type) : allComponents;

      const checklistItems = filteredComponents.map((c) => ({
        id: c.id,
        type: c.type,
        name: c.name,
        domain: c.domain,
      }));

      if (options.json === true) {
        console.log(
          JSON.stringify(
            formatSuccess({
              total: checklistItems.length,
              components: checklistItems,
            })
          )
        );
      }
    });
}
