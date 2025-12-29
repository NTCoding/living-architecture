import { Command } from 'commander';
import { getDefaultGraphPathDescription } from '../../graph-path';
import { formatError, formatSuccess } from '../../output';
import { CliErrorCode } from '../../error-codes';
import { isValidComponentType } from '../../component-types';
import { withGraphBuilder } from './link-infrastructure';

interface ComponentChecklistOptions {
  graph?: string;
  json?: boolean;
  type?: string;
}

export function createComponentChecklistCommand(): Command {
  return new Command('component-checklist')
    .description('List components as a checklist for linking/enrichment')
    .addHelpText(
      'after',
      `
Examples:
  $ riviere builder component-checklist
  $ riviere builder component-checklist --type DomainOp
  $ riviere builder component-checklist --type API --json
`
    )
    .option('--graph <path>', getDefaultGraphPathDescription())
    .option('--json', 'Output result as JSON')
    .option('--type <type>', 'Filter by component type')
    .action(async (options: ComponentChecklistOptions) => {
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

      await withGraphBuilder(options.graph, async (builder) => {
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
    });
}
