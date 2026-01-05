import { Command } from 'commander';
import {
  formatSuccess, formatError 
} from '../../output';
import { CliErrorCode } from '../../error-codes';
import {
  withGraph, getDefaultGraphPathDescription 
} from './load-graph';
import {
  isValidComponentType,
  normalizeToSchemaComponentType,
  VALID_COMPONENT_TYPES,
} from '../../component-types';
import { toComponentOutput } from './component-output';

interface ComponentsOptions {
  graph?: string;
  json?: boolean;
  domain?: string;
  type?: string;
}

export function createComponentsCommand(): Command {
  return new Command('components')
    .description('List components with optional filtering')
    .addHelpText(
      'after',
      `
Examples:
  $ riviere query components
  $ riviere query components --domain orders
  $ riviere query components --type API --json
  $ riviere query components --domain orders --type UseCase
`,
    )
    .option('--graph <path>', getDefaultGraphPathDescription())
    .option('--json', 'Output result as JSON')
    .option('--domain <name>', 'Filter by domain name')
    .option('--type <type>', 'Filter by component type')
    .action(async (options: ComponentsOptions) => {
      if (options.type !== undefined && !isValidComponentType(options.type)) {
        const errorMessage = `Invalid component type: ${options.type}. Valid types: ${VALID_COMPONENT_TYPES.join(', ')}`;
        if (options.json) {
          console.log(
            JSON.stringify(
              formatError(CliErrorCode.ValidationError, errorMessage),
            ),
          );
        } else {
          console.error(`Error: ${errorMessage}`);
        }
        return;
      }

      await withGraph(options.graph, (query) => {
        const allComponents = query.components();

        const filteredByDomain =
          options.domain === undefined
            ? allComponents
            : allComponents.filter((c) => c.domain === options.domain);

        const typeFilter =
          options.type === undefined
            ? undefined
            : normalizeToSchemaComponentType(options.type);
        const filteredByType =
          typeFilter === undefined
            ? filteredByDomain
            : filteredByDomain.filter((c) => c.type === typeFilter);

        const components = filteredByType.map(toComponentOutput);

        if (options.json) {
          console.log(JSON.stringify(formatSuccess({ components })));
        }
      });
    });
}
