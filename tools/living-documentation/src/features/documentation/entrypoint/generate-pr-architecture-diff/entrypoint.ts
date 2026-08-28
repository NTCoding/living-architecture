import { Command } from 'commander'
import type { GeneratePullRequestArchitectureDiff } from '@living-architecture/living-documentation-use-cases/features/documentation/queries/generate-pr-architecture-diff'
import { writePullRequestArchitectureDiff } from './pull-request-architecture-diff-writer'

interface GeneratePullRequestArchitectureDiffOptions {
  readonly base: string
  readonly head: string
  readonly output: string
}

/** @riviere-role cli-entrypoint-dependencies */
export interface GeneratePullRequestArchitectureDiffEntrypointDependencies {
  readonly generatePullRequestArchitectureDiff: Pick<GeneratePullRequestArchitectureDiff, 'execute'>
  readonly writePullRequestArchitectureDiff: typeof writePullRequestArchitectureDiff
}

/** @riviere-role cli-entrypoint */
export function createGeneratePullRequestArchitectureDiffCommand(
  dependencies: GeneratePullRequestArchitectureDiffEntrypointDependencies,
): Command {
  return new Command('generate-pr-architecture-diff')
    .description('Generate an architecture diff between two pull request workspaces')
    .requiredOption('--base <path>', 'Base workspace to inspect')
    .requiredOption('--head <path>', 'Head workspace to inspect')
    .requiredOption('--output <path>', 'Architecture diff file to write')
    .action((options: GeneratePullRequestArchitectureDiffOptions) => {
      const diff = dependencies.generatePullRequestArchitectureDiff.execute({
        baseWorkspaceRoot: options.base,
        headWorkspaceRoot: options.head,
        outputPath: options.output,
      })
      dependencies.writePullRequestArchitectureDiff(diff)
    })
}
