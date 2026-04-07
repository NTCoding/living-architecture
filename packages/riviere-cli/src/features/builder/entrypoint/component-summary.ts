import { Command } from 'commander'
import { CliErrorCode } from '../../../platform/infra/cli/presentation/error-codes'
import { getDefaultGraphPathDescription } from '../../../platform/infra/cli/presentation/graph-path-option'
import {
  formatError, formatSuccess 
} from '../../../platform/infra/cli/presentation/output'
import type { ComponentSummary } from '../commands/component-summary'

interface ComponentSummaryOptions {graph?: string}

/** @riviere-role cli-entrypoint */
export function createComponentSummaryCommand(componentSummary: ComponentSummary): Command {
  return new Command('component-summary')
    .description('Show component counts by type and domain')
    .addHelpText(
      'after',
      `
Examples:
  $ riviere builder component-summary
  $ riviere builder component-summary > summary.json
`,
    )
    .option('--graph <path>', getDefaultGraphPathDescription())
    .action(async (options: ComponentSummaryOptions) => {
      const result = componentSummary.execute({ graphPathOption: options.graph })
      if (!result.success) {
        console.log(
          JSON.stringify(
            formatError(
              result.code === 'GRAPH_NOT_FOUND'
                ? CliErrorCode.GraphNotFound
                : CliErrorCode.GraphCorrupted,
              result.message,
              [],
            ),
          ),
        )
        return
      }

      console.log(JSON.stringify(formatSuccess(result)))
    })
}
