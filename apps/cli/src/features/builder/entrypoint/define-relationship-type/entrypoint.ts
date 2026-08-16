import { Command } from 'commander'
import { getDefaultGraphPathDescription } from '../../../../infra/cli/presentation/graph-path-option'
import { formatError, formatSuccess } from '../../../../infra/cli/presentation/output'
import { CliErrorCode } from '../../../../infra/cli/presentation/error-codes'
import type { DefineRelationshipType } from '@living-architecture/riviere-builder-use-cases/features/builder/commands/define-relationship-type'

interface DefineRelationshipTypeOptions {
  name: string
  description: string
  graph?: string
  json?: boolean
}

/** @riviere-role cli-entrypoint-dependencies */
export interface CreateDefineRelationshipTypeCommandEntrypointDependencies {
  readonly defineRelationshipType: DefineRelationshipType
  readonly getDefaultGraphPathDescription: typeof getDefaultGraphPathDescription
  readonly formatError: typeof formatError
  readonly formatSuccess: typeof formatSuccess
}

/** @riviere-role cli-entrypoint */
export function createDefineRelationshipTypeCommand(
  dependencies: CreateDefineRelationshipTypeCommandEntrypointDependencies,
): Command {
  const { defineRelationshipType } = dependencies
  return new Command('define-relationship-type')
    .description('Define a project relationship type')
    .requiredOption('--name <name>', 'Relationship type name')
    .requiredOption('--description <description>', 'Relationship type description')
    .option('--graph <path>', dependencies.getDefaultGraphPathDescription())
    .option('--json', 'Output result as JSON')
    .action(async (options: DefineRelationshipTypeOptions) => {
      const result = defineRelationshipType.execute({
        description: options.description,
        graphPathOption: options.graph,
        name: options.name,
      })
      if (!result.success) {
        const errorCodeByResult = {
          GRAPH_CORRUPTED: CliErrorCode.GraphCorrupted,
          GRAPH_NOT_FOUND: CliErrorCode.GraphNotFound,
          VALIDATION_ERROR: CliErrorCode.ValidationError,
        } as const
        console.log(
          JSON.stringify(
            dependencies.formatError(errorCodeByResult[result.code], result.message, []),
          ),
        )
        return
      }

      if (options.json === true) {
        console.log(JSON.stringify(dependencies.formatSuccess(result)))
      }
    })
}
