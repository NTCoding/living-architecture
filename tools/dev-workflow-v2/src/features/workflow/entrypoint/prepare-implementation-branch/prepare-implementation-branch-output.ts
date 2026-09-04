import type { PrepareImplementationBranchResult } from '@living-architecture/dev-workflow-v2-use-cases/commands/prepare-implementation-branch'

/** @riviere-role cli-output-formatter */
export function formatPreparedImplementationBranch(
  result: PrepareImplementationBranchResult,
): string {
  return `Prepared ${result.branch} from ${result.remoteDefaultBranch} (${result.type}).\n`
}
