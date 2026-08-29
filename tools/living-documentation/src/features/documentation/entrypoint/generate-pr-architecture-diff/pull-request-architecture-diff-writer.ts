import { writeFileSync } from 'node:fs'
import type { PullRequestArchitectureDiff } from '@living-architecture/living-documentation-use-cases/features/documentation/queries/pull-request-architecture-diff'
import { formatPullRequestArchitectureDiff } from './pull-request-architecture-diff-formatter'

/** @riviere-role cli-response-writer */
export function writePullRequestArchitectureDiff(diff: PullRequestArchitectureDiff): void {
  writeFileSync(diff.outputPath, formatPullRequestArchitectureDiff(diff), 'utf8')
}
