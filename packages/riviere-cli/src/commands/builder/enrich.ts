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
  reads: string[];
  validates: string[];
  modifies: string[];
  emits: string[];
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

interface BehaviorOptions {
  reads: string[];
  validates: string[];
  modifies: string[];
  emits: string[];
}

function buildBehavior(options: BehaviorOptions): { behavior: object } | Record<string, never> {
  const hasBehavior =
    options.reads.length > 0 ||
    options.validates.length > 0 ||
    options.modifies.length > 0 ||
    options.emits.length > 0;

  if (!hasBehavior) {
    return {};
  }

  return {
    behavior: {
      ...(options.reads.length > 0 && { reads: options.reads }),
      ...(options.validates.length > 0 && { validates: options.validates }),
      ...(options.modifies.length > 0 && { modifies: options.modifies }),
      ...(options.emits.length > 0 && { emits: options.emits }),
    },
  };
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
    .description('Enrich a DomainOp component with semantic information')
    .addHelpText(
      'after',
      `
Examples:
  $ riviere builder enrich \\
      --id "orders:checkout:domainop:orderbegin" \\
      --entity Order \\
      --state-change "Draft:Placed" \\
      --business-rule "Order must have at least one item" \\
      --reads "this.items" \\
      --validates "items.length > 0" \\
      --modifies "this.state <- Placed" \\
      --emits "OrderPlaced event"

  $ riviere builder enrich \\
      --id "payments:gateway:domainop:paymentprocess" \\
      --state-change "Pending:Processing" \\
      --reads "amount parameter" \\
      --validates "amount > 0" \\
      --modifies "this.status <- Processing"
`
    )
    .requiredOption('--id <component-id>', 'Component ID to enrich')
    .option('--entity <name>', 'Entity name')
    .option('--state-change <from:to>', 'State transition (repeatable)', collectOption, [])
    .option('--business-rule <rule>', 'Business rule (repeatable)', collectOption, [])
    .option('--reads <value>', 'What the operation reads (repeatable)', collectOption, [])
    .option('--validates <value>', 'What the operation validates (repeatable)', collectOption, [])
    .option('--modifies <value>', 'What the operation modifies (repeatable)', collectOption, [])
    .option('--emits <value>', 'What the operation emits (repeatable)', collectOption, [])
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
            ...buildBehavior(options),
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
