import { Command } from 'commander';
import { writeFile } from 'node:fs/promises';
import { ComponentId } from '@living-architecture/riviere-builder';
import {
  getDefaultGraphPathDescription,
  resolveGraphPath,
} from '../../graph-path';
import { fileExists } from '../../file-existence';
import { formatSuccess } from '../../output';
import {
 isValidLinkType, normalizeComponentType 
} from '../../component-types';
import {
 validateComponentType, validateLinkType 
} from '../../validation';
import {
  loadGraphBuilder,
  reportGraphNotFound,
  tryBuilderOperation,
} from './link-infrastructure';

interface LinkOptions {
  from: string;
  toDomain: string;
  toModule: string;
  toType: string;
  toName: string;
  linkType?: string;
  graph?: string;
  json?: boolean;
}

export function createLinkCommand(): Command {
  return new Command('link')
    .description('Link two components')
    .addHelpText(
      'after',
      `
Examples:
  $ riviere builder link \\
      --from "orders:api:api:postorders" \\
      --to-domain orders --to-module checkout --to-type UseCase --to-name "place-order" \\
      --link-type sync

  $ riviere builder link \\
      --from "orders:checkout:domainop:orderbegin" \\
      --to-domain orders --to-module events --to-type Event --to-name "order-placed" \\
      --link-type async
`,
    )
    .requiredOption('--from <component-id>', 'Source component ID')
    .requiredOption('--to-domain <domain>', 'Target domain')
    .requiredOption('--to-module <module>', 'Target module')
    .requiredOption(
      '--to-type <type>',
      'Target component type (UI, API, UseCase, DomainOp, Event, EventHandler, Custom)',
    )
    .requiredOption('--to-name <name>', 'Target component name')
    .option('--link-type <type>', 'Link type (sync, async)')
    .option('--graph <path>', getDefaultGraphPathDescription())
    .option('--json', 'Output result as JSON')
    .action(async (options: LinkOptions) => {
      const componentTypeValidation = validateComponentType(options.toType);
      if (!componentTypeValidation.valid) {
        console.log(componentTypeValidation.errorJson);
        return;
      }

      const linkTypeValidation = validateLinkType(options.linkType);
      if (!linkTypeValidation.valid) {
        console.log(linkTypeValidation.errorJson);
        return;
      }

      const graphPath = resolveGraphPath(options.graph);
      const graphExists = await fileExists(graphPath);

      if (!graphExists) {
        reportGraphNotFound(graphPath);
        return;
      }

      const builder = await loadGraphBuilder(graphPath);

      const targetId = ComponentId.create({
        domain: options.toDomain,
        module: options.toModule,
        type: normalizeComponentType(options.toType),
        name: options.toName,
      }).toString();

      const linkInput: {
 from: string;
to: string;
type?: 'sync' | 'async' 
} = {
        from: options.from,
        to: targetId,
      };

      if (options.linkType !== undefined && isValidLinkType(options.linkType)) {
        linkInput.type = options.linkType;
      }

      const linkResult = tryBuilderOperation(() => builder.link(linkInput));
      if (linkResult === undefined) {
        return;
      }

      await writeFile(graphPath, builder.serialize(), 'utf-8');

      if (options.json) {
        console.log(JSON.stringify(formatSuccess({ link: linkResult })));
      }
    });
}
