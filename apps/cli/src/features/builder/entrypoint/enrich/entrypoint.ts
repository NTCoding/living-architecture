import { Command } from 'commander'
import { formatError, formatSuccess } from '../../../../infra/cli/presentation/output'
import { CliErrorCode } from '../../../../infra/cli/presentation/error-codes'
import { getDefaultGraphPathDescription } from '../../../../infra/cli/presentation/graph-path-option'
import { parseStateChanges } from './enrichment-parser'
import { parseSignature } from './signature-parser'
import type { EnrichComponent } from '@living-architecture/riviere-builder-use-cases/features/builder/commands/enrich-component'
interface EnrichOptions {
  id: string
  entity?: string
  stateChange: string[]
  businessRule: string[]
  reads: string[]
  validates: string[]
  modifies: string[]
  emits: string[]
  signature?: string
  graph?: string
  json?: boolean
}

/** @riviere-role cli-entrypoint-dependencies */
export interface CreateEnrichCommandEntrypointDependencies {
  readonly enrichComponent: EnrichComponent
  readonly defaultGraphFileLocation: string
  readonly getDefaultGraphPathDescription: typeof getDefaultGraphPathDescription
  readonly parseStateChanges: typeof parseStateChanges
  readonly formatError: typeof formatError
  readonly parseSignature: typeof parseSignature
  readonly formatSuccess: typeof formatSuccess
}

/** @riviere-role cli-entrypoint */
export function createEnrichCommand(
  dependencies: CreateEnrichCommandEntrypointDependencies,
): Command {
  const { enrichComponent } = dependencies
  return new Command('enrich')
    .description('Enrich a DomainOp component with semantic information.')
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
`,
    )
    .requiredOption('--id <component-id>', 'Component ID to enrich')
    .option('--entity <name>', 'Entity name')
    .option(
      '--state-change <from:to>',
      'State transition (repeatable)',
      (value, previous: string[]) => [...previous, value],
      [],
    )
    .option(
      '--business-rule <rule>',
      'Business rule (repeatable)',
      (value, previous: string[]) => [...previous, value],
      [],
    )
    .option(
      '--reads <value>',
      'What the operation reads (repeatable)',
      (value, previous: string[]) => [...previous, value],
      [],
    )
    .option(
      '--validates <value>',
      'What the operation validates (repeatable)',
      (value, previous: string[]) => [...previous, value],
      [],
    )
    .option(
      '--modifies <value>',
      'What the operation modifies (repeatable)',
      (value, previous: string[]) => [...previous, value],
      [],
    )
    .option(
      '--emits <value>',
      'What the operation emits (repeatable)',
      (value, previous: string[]) => [...previous, value],
      [],
    )
    .option(
      '--signature <dsl>',
      'Operation signature (e.g., "orderId:string, amount:number -> Order")',
    )
    .option('--graph <path>', dependencies.getDefaultGraphPathDescription())
    .option('--json', 'Output result as JSON')
    .action(async (options: EnrichOptions) => {
      const parseResult = dependencies.parseStateChanges(options.stateChange)
      if (!parseResult.success) {
        const msg = `Invalid state-change format: '${parseResult.invalidInput}'. Expected 'from:to'.`
        console.log(JSON.stringify(dependencies.formatError(CliErrorCode.ValidationError, msg, [])))
        return
      }
      const signatureResult =
        options.signature === undefined ? undefined : dependencies.parseSignature(options.signature)
      if (signatureResult !== undefined && !signatureResult.success) {
        console.log(
          JSON.stringify(
            dependencies.formatError(CliErrorCode.ValidationError, signatureResult.error, []),
          ),
        )
        return
      }
      const parsedSignature =
        signatureResult?.success === true ? signatureResult.signature : undefined
      const result = enrichComponent.execute({
        businessRules: options.businessRule,
        entity: options.entity,
        emits: options.emits,
        graphFileLocation: options.graph ?? dependencies.defaultGraphFileLocation,
        id: options.id,
        modifies: options.modifies,
        reads: options.reads,
        signature: parsedSignature,
        stateChanges: parseResult.stateChanges,
        validates: options.validates,
      })
      if (!result.result.success) {
        const errorCodeByResult = {
          COMPONENT_NOT_FOUND: CliErrorCode.ComponentNotFound,
          GRAPH_CORRUPTED: CliErrorCode.GraphCorrupted,
          GRAPH_NOT_FOUND: CliErrorCode.GraphNotFound,
          INVALID_COMPONENT_TYPE: CliErrorCode.InvalidComponentType,
        } as const
        const errorCode = errorCodeByResult[result.result.code]
        console.log(
          JSON.stringify(
            dependencies.formatError(errorCode, result.result.message, result.result.suggestions),
          ),
        )
        return
      }
      if (options.json === true) {
        console.log(
          JSON.stringify(dependencies.formatSuccess({ componentId: result.result.componentId })),
        )
      }
    })
}
