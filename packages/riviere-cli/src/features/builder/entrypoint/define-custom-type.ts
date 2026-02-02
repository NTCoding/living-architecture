import { Command } from 'commander'
import { writeFile } from 'node:fs/promises'
import { getDefaultGraphPathDescription } from '../../../platform/infra/graph-persistence/graph-path'
import { withGraphBuilder } from '../../../platform/infra/graph-persistence/builder-graph-loader'
import {
  formatError, formatSuccess 
} from '../../../platform/infra/cli-presentation/output'
import { CliErrorCode } from '../../../platform/infra/cli-presentation/error-codes'
import { parsePropertySpecs } from '../../../platform/infra/cli-presentation/custom-type-parser'
import { collectOption } from '../../../platform/infra/cli-presentation/option-collectors'

interface DefineCustomTypeOptions {
  name: string
  description?: string
  requiredProperty?: string[]
  optionalProperty?: string[]
  graph?: string
  json?: boolean
}

export function createDefineCustomTypeCommand(): Command {
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

      await withGraphBuilder(options.graph, async (builder, graphPath) => {
        builder.defineCustomType({
          name: options.name,
          ...(options.description !== undefined && { description: options.description }),
          ...(Object.keys(requiredResult.properties).length > 0 && {requiredProperties: requiredResult.properties,}),
          ...(Object.keys(optionalResult.properties).length > 0 && {optionalProperties: optionalResult.properties,}),
        })
        await writeFile(graphPath, builder.serialize(), 'utf-8')

        if (options.json === true) {
          console.log(
            JSON.stringify(
              formatSuccess({
                name: options.name,
                ...(options.description !== undefined && { description: options.description }),
                ...(Object.keys(requiredResult.properties).length > 0 && {requiredProperties: requiredResult.properties,}),
                ...(Object.keys(optionalResult.properties).length > 0 && {optionalProperties: optionalResult.properties,}),
              }),
            ),
          )
        }
      })
    })
}
