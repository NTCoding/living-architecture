import { Command } from 'commander'
import { formatSuccess } from '../../../../infra/cli/presentation/output'
import { formatQueryGraphLoadFailure } from '../../../../infra/cli/presentation/query-graph-load-failure-output'
import { getDefaultGraphPathDescription } from '../../../../infra/cli/presentation/graph-path-option'
import type { DetectOrphans } from '@living-architecture/riviere-builder-use-cases/features/query/queries/detect-orphans'

interface OrphansOptions {
  graph?: string
  json?: boolean
}

/** @riviere-role cli-entrypoint */
export function createOrphansCommand(detectOrphans: DetectOrphans): Command {
  return new Command('orphans')
    .description('Find orphan components with no links')
    .addHelpText(
      'after',
      `
Examples:
  $ riviere query orphans
  $ riviere query orphans --json
`,
    )
    .option('--graph <path>', getDefaultGraphPathDescription())
    .option('--json', 'Output result as JSON')
    .action(async (options: OrphansOptions) => {
      const result = detectOrphans.execute({ graphPathOption: options.graph })

      if ('kind' in result) {
        console.log(JSON.stringify(formatQueryGraphLoadFailure(result)))
        return
      }

      if (options.json) {
        console.log(JSON.stringify(formatSuccess(result)))
      }
    })
}
