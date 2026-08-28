import { Command } from 'commander'
import { getDefaultGraphPathDescription } from '../../../../infra/cli/presentation/graph-path-option'
import { formatError, formatSuccess } from '../../../../infra/cli/presentation/output'
import { CliErrorCode } from '../../../../infra/cli/presentation/error-codes'
import type { ComponentChecklist } from '@living-architecture/riviere-builder-use-cases/features/query/queries/component-checklist'

interface ComponentChecklistOptions {
  graph?: string
  json?: boolean
  type?: string
}

/** @riviere-role cli-entrypoint-dependencies */
export interface CreateComponentChecklistCommandEntrypointDependencies {
  readonly componentChecklist: ComponentChecklist
  readonly defaultGraphFileLocation: string
  readonly getDefaultGraphPathDescription: typeof getDefaultGraphPathDescription
  readonly formatError: typeof formatError
  readonly formatSuccess: typeof formatSuccess
}

/** @riviere-role cli-entrypoint */
export function createComponentChecklistCommand(
  dependencies: CreateComponentChecklistCommandEntrypointDependencies,
): Command {
  const { componentChecklist } = dependencies
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
    .option('--graph <path>', dependencies.getDefaultGraphPathDescription())
    .option('--json', 'Output result as JSON')
    .option('--type <type>', 'Filter by component type')
    .action(async (options: ComponentChecklistOptions) => {
      const result = componentChecklist.execute({
        graphFileLocation: options.graph ?? dependencies.defaultGraphFileLocation,
        type: options.type,
      })
      if (!result.result.success) {
        console.log(
          JSON.stringify(
            dependencies.formatError(
              {
                GRAPH_CORRUPTED: CliErrorCode.GraphCorrupted,
                GRAPH_NOT_FOUND: CliErrorCode.GraphNotFound,
                VALIDATION_ERROR: CliErrorCode.InvalidComponentType,
              }[result.result.code],
              result.result.message,
              [],
            ),
          ),
        )
        return
      }

      if (options.json === true) {
        console.log(
          JSON.stringify(
            dependencies.formatSuccess({
              components: result.result.components,
              total: result.result.total,
            }),
          ),
        )
      }
    })
}
