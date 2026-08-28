import { writeFileSync } from 'node:fs'
import type { ArchitectureSummary } from '@living-architecture/living-documentation-use-cases/features/documentation/queries/architecture-summary'

/** @riviere-role cli-response-writer */
export function writeArchitectureSummary(summary: ArchitectureSummary): void {
  writeFileSync(summary.outputPath, summary.markdown, 'utf8')
}
