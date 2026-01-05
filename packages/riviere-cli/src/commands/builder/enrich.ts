import { Command } from 'commander'
import { writeFile } from 'node:fs/promises'
import { InvalidEnrichmentTargetError } from '@living-architecture/riviere-builder'
import {
  withGraphBuilder, handleComponentNotFoundError 
} from './link-infrastructure'
import {
  formatError, formatSuccess 
} from '../../output'
import { CliErrorCode } from '../../error-codes'
import { getDefaultGraphPathDescription } from '../../graph-path'
import type {
  StateTransition,
  OperationSignature,
  OperationParameter,
} from '@living-architecture/riviere-schema'

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

function collectOption(value: string, previous: string[]): string[] {
  return [...previous, value]
}

function parseStateChange(input: string): StateTransition | undefined {
  const [from, to, ...rest] = input.split(':')
  if (from === undefined || to === undefined || rest.length > 0) {
    return undefined
  }
  return {
    from,
    to,
  }
}

type ParseResult =
  | {
    success: true
    stateChanges: StateTransition[]
  }
  | {
    success: false
    invalidInput: string
  }

function parseStateChanges(inputs: string[]): ParseResult {
  const stateChanges: StateTransition[] = []
  for (const sc of inputs) {
    const parsed = parseStateChange(sc)
    if (parsed === undefined) {
      return {
        success: false,
        invalidInput: sc,
      }
    }
    stateChanges.push(parsed)
  }
  return {
    success: true,
    stateChanges,
  }
}

interface BehaviorOptions {
  reads: string[]
  validates: string[]
  modifies: string[]
  emits: string[]
}

function buildBehavior(options: BehaviorOptions): { behavior: object } | Record<string, never> {
  const hasBehavior =
    options.reads.length > 0 ||
    options.validates.length > 0 ||
    options.modifies.length > 0 ||
    options.emits.length > 0

  if (!hasBehavior) {
    return {}
  }

  return {
    behavior: {
      ...(options.reads.length > 0 && { reads: options.reads }),
      ...(options.validates.length > 0 && { validates: options.validates }),
      ...(options.modifies.length > 0 && { modifies: options.modifies }),
      ...(options.emits.length > 0 && { emits: options.emits }),
    },
  }
}

function parseParameter(input: string): OperationParameter | undefined {
  const parts = input.split(':')
  if (parts.length < 2 || parts.length > 3) {
    return undefined
  }
  const [name, type, description] = parts
  if (name === undefined || name === '' || type === undefined || type === '') {
    return undefined
  }
  return {
    name: name.trim(),
    type: type.trim(),
    ...(description !== undefined && description !== '' && { description: description.trim() }),
  }
}

type SignatureParseResult =
  | {
    success: true
    signature: OperationSignature
  }
  | {
    success: false
    error: string
  }

type ParametersParseResult =
  | {
    success: true
    parameters: OperationParameter[]
  }
  | {
    success: false
    error: string
  }

function parseParameters(paramsPart: string): ParametersParseResult {
  if (paramsPart === '') {
    return {
      success: true,
      parameters: [],
    }
  }
  const paramStrings = paramsPart.split(',').map((p) => p.trim())
  const parameters: OperationParameter[] = []
  for (const paramStr of paramStrings) {
    const param = parseParameter(paramStr)
    if (param === undefined) {
      return {
        success: false,
        error: `Invalid parameter format: '${paramStr}'. Expected 'name:type' or 'name:type:description'.`,
      }
    }
    parameters.push(param)
  }
  return {
    success: true,
    parameters,
  }
}

function buildSignatureObject(
  parameters: OperationParameter[],
  returnType: string | undefined,
): OperationSignature {
  const signature: OperationSignature = {}
  if (parameters.length > 0) {
    signature.parameters = parameters
  }
  if (returnType !== undefined && returnType !== '') {
    signature.returnType = returnType
  }
  return signature
}

function parseSignature(input: string): SignatureParseResult {
  const trimmed = input.trim()

  // Handle "-> ReturnType" (return type only, no parameters)
  if (trimmed.startsWith('->')) {
    const returnType = trimmed.slice(2).trim()
    return returnType === ''
      ? {
        success: false,
        error: `Invalid signature format: '${input}'. Return type cannot be empty.`,
      }
      : {
        success: true,
        signature: { returnType },
      }
  }

  // Split on " -> " to separate parameters from return type
  const arrowIndex = trimmed.indexOf(' -> ')
  const paramsPart = arrowIndex === -1 ? trimmed : trimmed.slice(0, arrowIndex).trim()
  const returnType = arrowIndex === -1 ? undefined : trimmed.slice(arrowIndex + 4).trim()

  const paramsResult = parseParameters(paramsPart)
  if (!paramsResult.success) {
    return paramsResult
  }

  const signature = buildSignatureObject(paramsResult.parameters, returnType)

  // Must have at least parameters or returnType
  if (paramsResult.parameters.length === 0 && returnType === undefined) {
    return {
      success: false,
      error: `Invalid signature format: '${input}'. Expected 'param:type, ... -> ReturnType' or '-> ReturnType' or 'param:type'.`,
    }
  }

  return {
    success: true,
    signature,
  }
}

function handleEnrichmentError(error: unknown): void {
  if (error instanceof InvalidEnrichmentTargetError) {
    console.log(JSON.stringify(formatError(CliErrorCode.InvalidComponentType, error.message, [])))
    return
  }
  handleComponentNotFoundError(error)
}

export function createEnrichCommand(): Command {
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

      await withGraphBuilder(options.graph, async (builder, graphPath) => {
        try {
          builder.enrichComponent(options.id, {
            ...(options.entity !== undefined && { entity: options.entity }),
            ...(parseResult.stateChanges.length > 0 && { stateChanges: parseResult.stateChanges }),
            ...(options.businessRule.length > 0 && { businessRules: options.businessRule }),
            ...buildBehavior(options),
            ...(parsedSignature !== undefined && { signature: parsedSignature }),
          })
        } catch (error) {
          handleEnrichmentError(error)
          return
        }

        await writeFile(graphPath, builder.serialize(), 'utf-8')

        if (options.json === true) {
          console.log(JSON.stringify(formatSuccess({ componentId: options.id })))
        }
      })
    })
}
