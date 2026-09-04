import type {
  PrepareImplementationBranch,
  PrepareImplementationBranchResult,
} from '@living-architecture/dev-workflow-v2-use-cases/commands/prepare-implementation-branch'
import type { formatPreparedImplementationBranch } from './prepare-implementation-branch-output'
import type { parseImplementationBranchTarget } from './prepare-implementation-branch-target'
import type { formatFailedCliResponse } from '../../../../infra/cli/presentation/format-cli-response'
import type { writeCliResponse } from '../../../../infra/cli/presentation/write-cli-response'

/** @riviere-role cli-entrypoint-dependencies */
export interface PrepareImplementationBranchEntrypointDependencies {
  readonly formatPreparedImplementationBranch: typeof formatPreparedImplementationBranch
  readonly formatFailedCliResponse: typeof formatFailedCliResponse
  readonly parseImplementationBranchTarget: typeof parseImplementationBranchTarget
  readonly prepareImplementationBranch: Pick<PrepareImplementationBranch, 'execute'>
  readonly writeCliResponse: typeof writeCliResponse
}

/** @riviere-role cli-entrypoint */
export function runPrepareImplementationBranchEntrypoint(
  dependencies: PrepareImplementationBranchEntrypointDependencies,
): void {
  const targetBranch = dependencies.parseImplementationBranchTarget(process.argv.slice(2))
  if (targetBranch === undefined) {
    dependencies.writeCliResponse(
      dependencies.formatFailedCliResponse('Expected one target branch argument.\n'),
    )
    return
  }

  try {
    const result: PrepareImplementationBranchResult =
      dependencies.prepareImplementationBranch.execute({ targetBranch })
    dependencies.writeCliResponse(dependencies.formatPreparedImplementationBranch(result))
  } catch (error: unknown) {
    dependencies.writeCliResponse(dependencies.formatFailedCliResponse(`${String(error)}\n`))
  }
}
