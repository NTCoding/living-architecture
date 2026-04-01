import { Command } from 'commander'
import { getDefaultGraphPathDescription } from '../../../platform/infra/cli/presentation/graph-path-option'
import { formatSuccess } from '../../../platform/infra/cli/presentation/output'
import { withGraphBuilder } from '../infra/persistence/builder-graph-access'

interface CheckConsistencyOptions {
  graph?: string
  json?: boolean
}

/** @riviere-role cli-entrypoint */
export function createCheckConsistencyCommand(): Command {
  return new Command('check-consistency')
    .description('Check for structural issues in the graph')
    .addHelpText(
      'after',
      `
Examples:
  $ riviere builder check-consistency
  $ riviere builder check-consistency --json
`,
    )
    .option('--graph <path>', getDefaultGraphPathDescription())
    .option('--json', 'Output result as JSON')
    .action(async (options: CheckConsistencyOptions) => {
      await withGraphBuilder(options.graph, async (builder) => {
        const warnings = builder.warnings()
        const consistent = warnings.length === 0

        if (options.json === true) {
          console.log(
            JSON.stringify(
              formatSuccess({
                consistent,
                warnings,
              }),
            ),
          )
        }
      })
    })
}
