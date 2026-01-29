import { Command } from 'commander'
import { formatSuccess } from '../../../platform/infra/cli-presentation/output'
import { getDefaultGraphPathDescription } from '../../../platform/infra/graph-persistence/graph-path'
import { withGraphBuilder } from '../commands/link-infrastructure'

interface ValidateOptions {
  graph?: string
  json?: boolean
}

export function createValidateCommand(): Command {
  return new Command('validate')
    .description('Validate the graph for errors and warnings')
    .addHelpText(
      'after',
      `
Examples:
  $ riviere builder validate
  $ riviere builder validate --json
  $ riviere builder validate --graph .riviere/my-graph.json
`,
    )
    .option('--graph <path>', getDefaultGraphPathDescription())
    .option('--json', 'Output result as JSON')
    .action(async (options: ValidateOptions) => {
      await withGraphBuilder(options.graph, async (builder) => {
        const validationResult = builder.validate()
        const warnings = builder.warnings()

        if (options.json === true) {
          console.log(
            JSON.stringify(
              formatSuccess({
                valid: validationResult.valid,
                errors: validationResult.errors,
                warnings,
              }),
            ),
          )
        }
      })
    })
}
