import { Command } from 'commander'
import { formatSuccess } from '../../../../infra/cli/presentation/output'
import { formatQueryGraphLoadFailure } from '../../../../infra/cli/presentation/query-graph-load-failure-output'
import { getDefaultGraphPathDescription } from '../../../../infra/cli/presentation/graph-path-option'
import type { ListDomains } from '@living-architecture/riviere-builder-use-cases/features/query/queries/list-domains'

interface DomainsOptions {
  graph?: string
  json?: boolean
}

/** @riviere-role cli-entrypoint-dependencies */
export interface CreateDomainsCommandEntrypointDependencies {
  readonly listDomains: ListDomains
  readonly getDefaultGraphPathDescription: typeof getDefaultGraphPathDescription
  readonly formatQueryGraphLoadFailure: typeof formatQueryGraphLoadFailure
  readonly formatSuccess: typeof formatSuccess
}

/** @riviere-role cli-entrypoint */
export function createDomainsCommand(
  dependencies: CreateDomainsCommandEntrypointDependencies,
): Command {
  const { listDomains } = dependencies
  return new Command('domains')
    .description('List domains with component counts')
    .addHelpText(
      'after',
      `
Examples:
  $ riviere query domains
  $ riviere query domains --json
`,
    )
    .option('--graph <path>', dependencies.getDefaultGraphPathDescription())
    .option('--json', 'Output result as JSON')
    .action(async (options: DomainsOptions) => {
      const result = listDomains.execute({ graphPathOption: options.graph })

      if ('kind' in result) {
        console.log(JSON.stringify(dependencies.formatQueryGraphLoadFailure(result)))
        return
      }

      if (options.json) {
        console.log(JSON.stringify(dependencies.formatSuccess(result)))
      }
    })
}
