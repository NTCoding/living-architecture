import type { ArchitectureSummaryLoader } from '../data-access/architecture-summary/architecture-summary-loader'
import type { ArchitectureSummary } from './architecture-summary'
import type { GenerateArchitectureSummaryInput } from './generate-architecture-summary-input'

/** @riviere-role query-model-use-case */
export class GenerateArchitectureSummary {
  constructor(private readonly architectureSummaries: ArchitectureSummaryLoader) {}

  execute(input: GenerateArchitectureSummaryInput): ArchitectureSummary {
    return this.architectureSummaries.load(input.workspaceRoot, input.outputPath)
  }
}
