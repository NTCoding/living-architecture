import { Command } from 'commander';
import { writeFile } from 'node:fs/promises';
import { InvalidEnrichmentTargetError } from '@living-architecture/riviere-builder';
import { withGraphBuilder, handleComponentNotFoundError } from './link-infrastructure';
import { formatError, formatSuccess } from '../../output';
import { CliErrorCode } from '../../error-codes';
import { getDefaultGraphPathDescription } from '../../graph-path';
import type { StateTransition } from '@living-architecture/riviere-schema';

interface EnrichOptions {
  id: string;
  entity?: string;
  stateChange: string[];
  businessRule: string[];
  graph?: string;
  json?: boolean;
}

function collectOption(value: string, previous: string[]): string[] {
  return [...previous, value];
}

function parseStateChange(input: string): StateTransition | undefined {
  const [from, to, ...rest] = input.split(':');
  if (from === undefined || to === undefined || rest.length > 0) {
    return undefined;
  }
  return { from, to };
}

type ParseResult = { success: true; stateChanges: StateTransition[] } | { success: false; invalidInput: string };

function parseStateChanges(inputs: string[]): ParseResult {
  const stateChanges: StateTransition[] = [];
  for (const sc of inputs) {
    const parsed = parseStateChange(sc);
    if (parsed === undefined) {
      return { success: false, invalidInput: sc };
    }
    stateChanges.push(parsed);
  }
  return { success: true, stateChanges };
}

function handleEnrichmentError(error: unknown): void {
  if (error instanceof InvalidEnrichmentTargetError) {
    console.log(JSON.stringify(formatError(CliErrorCode.InvalidComponentType, error.message, [])));
    return;
  }
  handleComponentNotFoundError(error);
}

export function createEnrichCommand(): Command {
  return new Command('enrich')
    .description('Enrich a DomainOp component with entity, state changes, and business rules')
    .requiredOption('--id <component-id>', 'Component ID to enrich')
    .option('--entity <name>', 'Entity name')
    .option('--state-change <from:to>', 'State transition (repeatable)', collectOption, [])
    .option('--business-rule <rule>', 'Business rule (repeatable)', collectOption, [])
    .option('--graph <path>', getDefaultGraphPathDescription())
    .option('--json', 'Output result as JSON')
    .action(async (options: EnrichOptions) => {
      const parseResult = parseStateChanges(options.stateChange);
      if (!parseResult.success) {
        const msg = `Invalid state-change format: '${parseResult.invalidInput}'. Expected 'from:to'.`;
        console.log(JSON.stringify(formatError(CliErrorCode.ValidationError, msg, [])));
        return;
      }

      await withGraphBuilder(options.graph, async (builder, graphPath) => {
        try {
          builder.enrichComponent(options.id, {
            ...(options.entity !== undefined && { entity: options.entity }),
            ...(parseResult.stateChanges.length > 0 && { stateChanges: parseResult.stateChanges }),
            ...(options.businessRule.length > 0 && { businessRules: options.businessRule }),
          });
        } catch (error) {
          handleEnrichmentError(error);
          return;
        }

        await writeFile(graphPath, builder.serialize(), 'utf-8');

        if (options.json === true) {
          console.log(JSON.stringify(formatSuccess({ componentId: options.id })));
        }
      });
    });
}
