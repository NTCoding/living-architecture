import { Command } from 'commander'
import { getDefaultGraphPathDescription } from '../../../platform/infra/cli/presentation/graph-path-option'
import {
  formatError, formatSuccess 
} from '../../../platform/infra/cli/presentation/output'
import { CliErrorCode } from '../../../platform/infra/cli/presentation/error-codes'
import { parsePropertySpecs } from '../../../platform/infra/cli/input/custom-type-parser'
import { collectOption } from '../../../platform/infra/cli/input/option-collectors'
import type { DefineCustomType } from '../commands/define-custom-type'

interface DefineCustomTypeOptions {
  name: string
  description?: string
  requiredProperty?: string[]
  optionalProperty?: string[]
  graph?: string
  json?: boolean
}

/** @riviere-role cli-entrypoint */
export function createDefineCustomTypeCommand(defineCustomType: DefineCustomType): Command {
  return new Command('define-custom-type')
    .description('Define a custom component type')
    .requiredOption('--name <name>', 'Custom type name')
    .option('--description <desc>', 'Custom type description')
    .option(
      '--required-property <spec>',
      'Required property (format: name:type[:description])',
      collectOption,
      [],
    )
    .option(
      '--optional-property <spec>',
      'Optional property (format: name:type[:description])',
      collectOption,
      [],
    )
    .option('--graph <path>', getDefaultGraphPathDescription())
    .option('--json', 'Output result as JSON')
    .action(async (options: DefineCustomTypeOptions) => {
      const requiredResult = parsePropertySpecs(options.requiredProperty)
      if (!requiredResult.success) {
        console.log(
          JSON.stringify(formatError(CliErrorCode.ValidationError, requiredResult.error, [])),
        )
        return
      }

      const optionalResult = parsePropertySpecs(options.optionalProperty)
      if (!optionalResult.success) {
        console.log(
          JSON.stringify(formatError(CliErrorCode.ValidationError, optionalResult.error, [])),
        )
        return
      }

      const result = defineCustomType.execute({
        description: options.description,
        graphPathOption: options.graph,
        name: options.name,
        optionalProperties: optionalResult.properties,
        requiredProperties: requiredResult.properties,
      })
      if (!result.success) {
        const errorCodeByResult = {
          GRAPH_CORRUPTED: CliErrorCode.GraphCorrupted,
          GRAPH_NOT_FOUND: CliErrorCode.GraphNotFound,
          VALIDATION_ERROR: CliErrorCode.ValidationError,
        } as const
        const errorCode = errorCodeByResult[result.code]

        console.log(JSON.stringify(formatError(errorCode, result.message, [])))
        return
      }

      if (options.json === true) {
        console.log(JSON.stringify(formatSuccess(result)))
      }
    })
}
