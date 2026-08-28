#!/usr/bin/env node
import { Command } from 'commander'
import { ArchitectureSourceLoader } from '@living-architecture/living-documentation-use-cases/features/documentation/data-access/architecture-source/architecture-source-loader'
import { ArchitectureSummaryLoader } from '@living-architecture/living-documentation-use-cases/features/documentation/data-access/architecture-summary/architecture-summary-loader'
import { GenerateArchitectureSummary } from '@living-architecture/living-documentation-use-cases/features/documentation/queries/generate-architecture-summary'
import { GeneratePullRequestArchitectureDiff } from '@living-architecture/living-documentation-use-cases/features/documentation/queries/generate-pr-architecture-diff'
import { inspectTypescriptSubdomains } from '@living-architecture/living-documentation-use-cases/infra/external-clients/typescript/domain-guide-source'
import { TypescriptWorkspaceReader } from '@living-architecture/living-documentation-use-cases/infra/external-clients/typescript/typescript-workspace-reader'
import { createGenerateArchitectureSummaryCommand } from '../features/documentation/entrypoint/generate-architecture-summary/entrypoint'
import { writeArchitectureSummary } from '../features/documentation/entrypoint/generate-architecture-summary/architecture-summary-writer'
import { createGeneratePullRequestArchitectureDiffCommand } from '../features/documentation/entrypoint/generate-pr-architecture-diff/entrypoint'
import { writePullRequestArchitectureDiff } from '../features/documentation/entrypoint/generate-pr-architecture-diff/pull-request-architecture-diff-writer'

/** @riviere-role main */
function createLivingDocumentationProgram(): Command {
  const typescriptWorkspace = new TypescriptWorkspaceReader()
  const program = new Command().name('living-documentation')
  program.addCommand(
    createGenerateArchitectureSummaryCommand({
      generateArchitectureSummary: new GenerateArchitectureSummary(
        new ArchitectureSummaryLoader(inspectTypescriptSubdomains),
      ),
      writeArchitectureSummary,
    }),
  )
  program.addCommand(
    createGeneratePullRequestArchitectureDiffCommand({
      generatePullRequestArchitectureDiff: new GeneratePullRequestArchitectureDiff(
        new ArchitectureSourceLoader(typescriptWorkspace),
      ),
      writePullRequestArchitectureDiff,
    }),
  )
  return program
}

await createLivingDocumentationProgram().parseAsync()
