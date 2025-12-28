import { Command } from 'commander';
import { writeFile } from 'node:fs/promises';
import type { ExternalTarget } from '@living-architecture/riviere-schema';
import { getDefaultGraphPathDescription, resolveGraphPath } from '../../graph-path';
import { fileExists } from '../../file-existence';
import { formatSuccess } from '../../output';
import { isValidLinkType } from '../../component-types';
import { validateLinkType } from '../../validation';
import { loadGraphBuilder, reportGraphNotFound, tryBuilderOperation } from './link-infrastructure';

interface ExternalLinkInput {
  from: string;
  target: ExternalTarget;
  type?: 'sync' | 'async';
}

interface LinkExternalOptions {
  from: string;
  targetName: string;
  targetDomain?: string;
  targetUrl?: string;
  linkType?: string;
  graph?: string;
  json?: boolean;
}

function buildExternalTarget(options: LinkExternalOptions): ExternalTarget {
  return {
    name: options.targetName,
    ...(options.targetDomain && { domain: options.targetDomain }),
    ...(options.targetUrl && { url: options.targetUrl }),
  };
}

export function createLinkExternalCommand(): Command {
  return new Command('link-external')
    .description('Link a component to an external system')
    .requiredOption('--from <component-id>', 'Source component ID')
    .requiredOption('--target-name <name>', 'External target name')
    .option('--target-domain <domain>', 'External target domain')
    .option('--target-url <url>', 'External target URL')
    .option('--link-type <type>', 'Link type (sync, async)')
    .option('--graph <path>', getDefaultGraphPathDescription())
    .option('--json', 'Output result as JSON')
    .action(async (options: LinkExternalOptions) => {
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
      const target = buildExternalTarget(options);

      const externalLinkInput: ExternalLinkInput = {
        from: options.from,
        target,
      };

      if (options.linkType !== undefined && isValidLinkType(options.linkType)) {
        externalLinkInput.type = options.linkType;
      }

      const externalLink = tryBuilderOperation(() => builder.linkExternal(externalLinkInput));
      if (externalLink === undefined) {
        return;
      }

      await writeFile(graphPath, builder.serialize(), 'utf-8');

      if (options.json) {
        console.log(JSON.stringify(formatSuccess({ externalLink })));
      }
    });
}
