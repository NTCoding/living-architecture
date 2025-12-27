import { Command } from 'commander';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { RiviereBuilder } from '@living-architecture/riviere-builder';
import type { BuilderOptions } from '@living-architecture/riviere-builder';
import { formatError, formatSuccess } from '../../output';
import { CliErrorCode } from '../../error-codes';
import { fileExists } from '../../file-existence';
import { resolveGraphPath, getDefaultGraphPathDescription } from '../../graph-path';
import type { SystemType } from '@living-architecture/riviere-schema';

interface DomainInputParsed {
  name: string;
  description: string;
  systemType: SystemType;
}

const VALID_SYSTEM_TYPES: readonly SystemType[] = ['domain', 'bff', 'ui', 'other'];

function isDomainInputParsed(value: unknown): value is DomainInputParsed {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  return (
    'name' in value &&
    typeof value.name === 'string' &&
    'description' in value &&
    typeof value.description === 'string' &&
    'systemType' in value &&
    typeof value.systemType === 'string' &&
    VALID_SYSTEM_TYPES.some((t) => t === value.systemType)
  );
}

function parseDomainJson(value: string, previous: DomainInputParsed[]): DomainInputParsed[] {
  const parsed: unknown = JSON.parse(value);
  if (!isDomainInputParsed(parsed)) {
    throw new Error(`Invalid domain JSON: ${value}`);
  }
  return [...previous, parsed];
}

function collectSource(value: string, previous: string[]): string[] {
  return [...previous, value];
}

interface InitOptions {
  name?: string;
  graph?: string;
  json?: boolean;
  source: string[];
  domain: DomainInputParsed[];
}

export function createInitCommand(): Command {
  return new Command('init')
    .description('Initialize a new graph')
    .option('--name <name>', 'System name')
    .option('--graph <path>', getDefaultGraphPathDescription())
    .option('--json', 'Output result as JSON')
    .option('--source <url>', 'Source repository URL (repeatable)', collectSource, [])
    .option('--domain <json>', 'Domain as JSON (repeatable)', parseDomainJson, [])
    .action(async (options: InitOptions) => {
      // Validate required flags
      if (options.source.length === 0) {
        console.log(
          JSON.stringify(
            formatError(CliErrorCode.ValidationError, 'At least one source required', [
              'Add --source <url> flag',
            ])
          )
        );
        return;
      }

      if (options.domain.length === 0) {
        console.log(
          JSON.stringify(
            formatError(CliErrorCode.ValidationError, 'At least one domain required', [
              'Add --domain <json> flag',
            ])
          )
        );
        return;
      }

      const graphPath = resolveGraphPath(options.graph);
      const graphDir = dirname(graphPath);

      const graphExists = await fileExists(graphPath);

      if (graphExists) {
        console.log(
          JSON.stringify(
            formatError(CliErrorCode.GraphExists, `Graph already exists at ${graphPath}`, [
              'Delete the file to reinitialize',
            ])
          )
        );
        return;
      }

      const domains: BuilderOptions['domains'] = {};
      for (const d of options.domain) {
        domains[d.name] = {
          description: d.description,
          systemType: d.systemType,
        };
      }

      const builderOptions: BuilderOptions = {
        sources: options.source.map((url) => ({ repository: url })),
        domains,
      };

      if (options.name !== undefined) {
        builderOptions.name = options.name;
      }

      const builder = RiviereBuilder.new(builderOptions);

      await mkdir(graphDir, { recursive: true });
      await writeFile(graphPath, builder.serialize(), 'utf-8');

      if (options.json === true) {
        const domainNames = options.domain.map((d) => d.name);
        console.log(
          JSON.stringify(
            formatSuccess({
              path: graphPath,
              sources: options.source.length,
              domains: domainNames,
            })
          )
        );
      }
    });
}
