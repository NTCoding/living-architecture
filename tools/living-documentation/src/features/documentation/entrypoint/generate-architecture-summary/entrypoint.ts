import { Command } from 'commander'
import type { GenerateArchitectureSummary } from '@living-architecture/living-documentation-use-cases/features/documentation/queries/generate-architecture-summary'
import { writeArchitectureSummary } from './architecture-summary-writer'

interface GenerateArchitectureSummaryOptions {
  readonly output: string
  readonly workspaceRoot: string
}

/** @riviere-role cli-entrypoint-dependencies */
export interface GenerateArchitectureSummaryEntrypointDependencies {
  readonly generateArchitectureSummary: Pick<GenerateArchitectureSummary, 'execute'>
  readonly writeArchitectureSummary: typeof writeArchitectureSummary
}

/** @riviere-role cli-entrypoint */
export function createGenerateArchitectureSummaryCommand(
  dependencies: GenerateArchitectureSummaryEntrypointDependencies,
): Command {
  return new Command('generate-architecture-summary')
    .description('Generate the current architecture summary')
    .option('--workspace-root <path>', 'Workspace to inspect', '.')
    .option('--output <path>', 'Summary file to write', 'docs/architecture/ddd/domain-guide.md')
    .action((options: GenerateArchitectureSummaryOptions) => {
      const summary = dependencies.generateArchitectureSummary.execute({
        outputPath: options.output,
        workspaceRoot: options.workspaceRoot,
      })
      dependencies.writeArchitectureSummary(summary)
    })
}
