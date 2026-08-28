import { Command } from 'commander'
import { getDefaultGraphPathDescription } from '../../../../infra/cli/presentation/graph-path-option'
import { formatError, formatSuccess } from '../../../../infra/cli/presentation/output'
import { CliErrorCode } from '../../../../infra/cli/presentation/error-codes'
import { parsePropertySpecs } from './custom-type-parser'
import type { DefineCustomType } from '@living-architecture/riviere-extract-ts-use-cases/features/extract/commands/define-custom-type'

interface DefineCustomTypeOptions {
  name: string
  description?: string
  requiredProperty?: string[]
  optionalProperty?: string[]
  graph?: string
  json?: boolean
}

/** @riviere-role cli-entrypoint-dependencies */
export interface CreateDefineCustomTypeCommandEntrypointDependencies {
  readonly defineCustomType: DefineCustomType
  readonly defaultGraphFileLocation: string
  readonly getDefaultGraphPathDescription: typeof getDefaultGraphPathDescription
  readonly parsePropertySpecs: typeof parsePropertySpecs
  readonly formatError: typeof formatError
  readonly formatSuccess: typeof formatSuccess
}

/** @riviere-role cli-entrypoint */
export function createDefineCustomTypeCommand(
  dependencies: CreateDefineCustomTypeCommandEntrypointDependencies,
): Command {
  const { defineCustomType } = dependencies
  return new Command('define-custom-type')
    .description('Define a custom component type')
    .requiredOption('--name <name>', 'Custom type name')
    .option('--description <desc>', 'Custom type description')
    .option(
      '--required-property <spec>',
      'Required property (format: name:type[:description])',
      (value, previous: string[]) => [...previous, value],
      [],
    )
    .option(
      '--optional-property <spec>',
      'Optional property (format: name:type[:description])',
      (value, previous: string[]) => [...previous, value],
      [],
    )
    .option('--graph <path>', dependencies.getDefaultGraphPathDescription())
    .option('--json', 'Output result as JSON')
    .action(async (options: DefineCustomTypeOptions) => {
      const requiredResult = dependencies.parsePropertySpecs(options.requiredProperty)
      if (!requiredResult.success) {
        console.log(
          JSON.stringify(
            dependencies.formatError(CliErrorCode.ValidationError, requiredResult.error, []),
          ),
        )
        return
      }

      const optionalResult = dependencies.parsePropertySpecs(options.optionalProperty)
      if (!optionalResult.success) {
        console.log(
          JSON.stringify(
            dependencies.formatError(CliErrorCode.ValidationError, optionalResult.error, []),
          ),
        )
        return
      }

      const result = defineCustomType.execute({
        description: options.description,
        graphFileLocation: options.graph ?? dependencies.defaultGraphFileLocation,
        name: options.name,
        optionalProperties: optionalResult.properties,
        requiredProperties: requiredResult.properties,
      })
      if (!result.result.success) {
        const errorCodeByResult = {
          GRAPH_CORRUPTED: CliErrorCode.GraphCorrupted,
          GRAPH_NOT_FOUND: CliErrorCode.GraphNotFound,
          VALIDATION_ERROR: CliErrorCode.ValidationError,
        } as const
        const errorCode = errorCodeByResult[result.result.code]

        console.log(JSON.stringify(dependencies.formatError(errorCode, result.result.message, [])))
        return
      }

      if (options.json === true) {
        console.log(JSON.stringify(dependencies.formatSuccess(result.result)))
      }
    })
}
