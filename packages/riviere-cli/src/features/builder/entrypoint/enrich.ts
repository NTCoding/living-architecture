import { Command } from 'commander'
import {
  formatError, formatSuccess 
} from '../../../platform/infra/cli/presentation/output'
import { CliErrorCode } from '../../../platform/infra/cli/presentation/error-codes'
import { getDefaultGraphPathDescription } from '../../../platform/infra/cli/presentation/graph-path-option'
import { collectOption } from '../../../platform/infra/cli/input/option-collectors'
import { parseStateChanges } from '../../../platform/infra/cli/input/enrichment-parser'
import { parseSignature } from '../../../platform/infra/cli/input/signature-parser'
import type { EnrichComponent } from '../commands/enrich-component'

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

/** @riviere-role cli-entrypoint */
export function createEnrichCommand(enrichComponent: EnrichComponent): Command {
  return new Command('enrich')
    .description(
      'Enrich a DomainOp component with semantic information. ' +
        'Note: Enrichment is additive — running multiple times accumulates values.',
    )
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
`,
    )
    .requiredOption('--id <component-id>', 'Component ID to enrich')
    .option('--entity <name>', 'Entity name')
    .option('--state-change <from:to>', 'State transition (repeatable)', collectOption, [])
    .option('--business-rule <rule>', 'Business rule (repeatable)', collectOption, [])
    .option('--reads <value>', 'What the operation reads (repeatable)', collectOption, [])
    .option('--validates <value>', 'What the operation validates (repeatable)', collectOption, [])
    .option('--modifies <value>', 'What the operation modifies (repeatable)', collectOption, [])
    .option('--emits <value>', 'What the operation emits (repeatable)', collectOption, [])
    .option(
      '--signature <dsl>',
      'Operation signature (e.g., "orderId:string, amount:number -> Order")',
    )
    .option('--graph <path>', getDefaultGraphPathDescription())
    .option('--json', 'Output result as JSON')
    .action(async (options: EnrichOptions) => {
      const parseResult = parseStateChanges(options.stateChange)
      if (!parseResult.success) {
        const msg = `Invalid state-change format: '${parseResult.invalidInput}'. Expected 'from:to'.`
        console.log(JSON.stringify(formatError(CliErrorCode.ValidationError, msg, [])))
        return
      }

      const signatureResult =
        options.signature === undefined ? undefined : parseSignature(options.signature)
      if (signatureResult !== undefined && !signatureResult.success) {
        console.log(
          JSON.stringify(formatError(CliErrorCode.ValidationError, signatureResult.error, [])),
        )
        return
      }
      const parsedSignature =
        signatureResult?.success === true ? signatureResult.signature : undefined

      const result = enrichComponent.execute({
        businessRules: options.businessRule,
        entity: options.entity,
        emits: options.emits,
        graphPathOption: options.graph,
        id: options.id,
        modifies: options.modifies,
        reads: options.reads,
        signature: parsedSignature,
        stateChanges: parseResult.stateChanges,
        validates: options.validates,
      })
      if (!result.success) {
        const errorCodeByResult = {
          COMPONENT_NOT_FOUND: CliErrorCode.ComponentNotFound,
          GRAPH_CORRUPTED: CliErrorCode.GraphCorrupted,
          GRAPH_NOT_FOUND: CliErrorCode.GraphNotFound,
          INVALID_COMPONENT_TYPE: CliErrorCode.InvalidComponentType,
        } as const
        const errorCode = errorCodeByResult[result.code]

        console.log(JSON.stringify(formatError(errorCode, result.message, result.suggestions)))
        return
      }

      if (options.json === true) {
        console.log(JSON.stringify(formatSuccess({ componentId: result.componentId })))
      }
    })
}
