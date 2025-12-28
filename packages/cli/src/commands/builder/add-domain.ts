import { Command } from 'commander';
import { writeFile } from 'node:fs/promises';
import { DuplicateDomainError } from '@living-architecture/riviere-builder';
import { formatError, formatSuccess } from '../../output';
import { CliErrorCode } from '../../error-codes';
import { getDefaultGraphPathDescription } from '../../graph-path';
import { isValidSystemType, VALID_SYSTEM_TYPES } from '../../component-types';
import { withGraphBuilder } from './link-infrastructure';

interface AddDomainOptions {
  name: string;
  description: string;
  systemType: string;
  graph?: string;
  json?: boolean;
}

export function createAddDomainCommand(): Command {
  return new Command('add-domain')
    .description('Add a domain to the graph')
    .requiredOption('--name <name>', 'Domain name')
    .requiredOption('--description <description>', 'Domain description')
    .requiredOption('--system-type <type>', 'System type (domain, bff, ui, other)')
    .option('--graph <path>', getDefaultGraphPathDescription())
    .option('--json', 'Output result as JSON')
    .action(async (options: AddDomainOptions) => {
      if (!isValidSystemType(options.systemType)) {
        console.log(
          JSON.stringify(
            formatError(
              CliErrorCode.ValidationError,
              `Invalid system type: ${options.systemType}`,
              [`Valid types: ${VALID_SYSTEM_TYPES.join(', ')}`]
            )
          )
        );
        return;
      }
      const systemType = options.systemType;

      await withGraphBuilder(options.graph, async (builder, graphPath) => {
        try {
          builder.addDomain({
            name: options.name,
            description: options.description,
            systemType,
          });
        } catch (error) {
          if (error instanceof DuplicateDomainError) {
            console.log(
              JSON.stringify(
                formatError(CliErrorCode.DuplicateDomain, error.message, ['Use a different domain name'])
              )
            );
            return;
          }
          throw error;
        }

        await writeFile(graphPath, builder.serialize(), 'utf-8');

        if (options.json === true) {
          console.log(
            JSON.stringify(
              formatSuccess({
                name: options.name,
                description: options.description,
                systemType: options.systemType,
              })
            )
          );
        }
      });
    });
}
