import { writeFileSync } from 'node:fs'
import type { PullRequestArchitectureDiff } from '@living-architecture/living-documentation-use-cases/features/documentation/queries/pull-request-architecture-diff'

/** @riviere-role cli-response-writer */
export function writePullRequestArchitectureDiff(diff: PullRequestArchitectureDiff): void {
  writeFileSync(diff.outputPath, diff.markdown, 'utf8')
}
