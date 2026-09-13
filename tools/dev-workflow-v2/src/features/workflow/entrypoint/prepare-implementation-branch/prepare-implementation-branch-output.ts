import type { PrepareImplementationBranchResult } from '@living-architecture/dev-workflow-v2-use-cases/commands/prepare-implementation-branch'
import {
  type CliOutput,
  formatSuccessfulCliResponse,
} from '../../../../infra/cli/presentation/format-cli-response'

/** @riviere-role cli-output-formatter */
export function formatPreparedImplementationBranch(
  result: PrepareImplementationBranchResult,
): CliOutput {
  return formatSuccessfulCliResponse(
    `Prepared ${result.branch} from ${result.remoteDefaultBranch} (${result.type}).\n`,
  )
}
