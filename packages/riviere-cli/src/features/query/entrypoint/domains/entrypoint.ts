import { Command } from 'commander'
import { formatSuccess } from '../../../../platform/infra/cli/presentation/output'
import { formatQueryGraphLoadFailure } from '../../../../platform/infra/cli/presentation/query-graph-load-failure-output'
import { getDefaultGraphPathDescription } from '../../../../platform/infra/cli/presentation/graph-path-option'
import type { ListDomains } from '../../queries/list-domains'

interface DomainsOptions {
  graph?: string
  json?: boolean
}

/** @riviere-role cli-entrypoint */
export function createDomainsCommand(listDomains: ListDomains): Command {
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
    .option('--graph <path>', getDefaultGraphPathDescription())
    .option('--json', 'Output result as JSON')
    .action(async (options: DomainsOptions) => {
      const result = listDomains.execute({ graphPathOption: options.graph })

      if ('kind' in result) {
        console.log(JSON.stringify(formatQueryGraphLoadFailure(result)))
        return
      }

      if (options.json) {
        console.log(JSON.stringify(formatSuccess(result)))
      }
    })
}
