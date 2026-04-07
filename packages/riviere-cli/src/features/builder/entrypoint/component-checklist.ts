import { Command } from 'commander'
import { getDefaultGraphPathDescription } from '../../../platform/infra/cli/presentation/graph-path-option'
import {
  formatError, formatSuccess 
} from '../../../platform/infra/cli/presentation/output'
import { CliErrorCode } from '../../../platform/infra/cli/presentation/error-codes'
import { isValidComponentType } from '../../../platform/infra/cli/input/component-types'
import type { ComponentChecklist } from '../commands/component-checklist'

interface ComponentChecklistOptions {
  graph?: string
  json?: boolean
  type?: string
}

/** @riviere-role cli-entrypoint */
export function createComponentChecklistCommand(componentChecklist: ComponentChecklist): Command {
  return new Command('component-checklist')
    .description('List components as a checklist for linking/enrichment')
    .addHelpText(
      'after',
      `
Examples:
  $ riviere builder component-checklist
  $ riviere builder component-checklist --type DomainOp
  $ riviere builder component-checklist --type API --json
`,
    )
    .option('--graph <path>', getDefaultGraphPathDescription())
    .option('--json', 'Output result as JSON')
    .option('--type <type>', 'Filter by component type')
    .action(async (options: ComponentChecklistOptions) => {
      if (options.type !== undefined && !isValidComponentType(options.type)) {
        console.log(
          JSON.stringify(
            formatError(
              CliErrorCode.InvalidComponentType,
              `Invalid component type: ${options.type}`,
              ['Valid types: UI, API, UseCase, DomainOp, Event, EventHandler, Custom'],
            ),
          ),
        )
        return
      }

      const result = componentChecklist.execute({
        graphPathOption: options.graph,
        type: options.type,
      })
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

      if (options.json === true) {
        console.log(
          JSON.stringify(
            formatSuccess({
              components: result.components,
              total: result.total,
            }),
          ),
        )
      }
    })
}
