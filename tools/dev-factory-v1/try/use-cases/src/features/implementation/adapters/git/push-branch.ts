import type { PushBranch } from '@dev-factory-v1/domain-model/domain/ports/push-branch'
import type {
  CommandOutput,
  CommandRequest,
} from '../../../../infra/external-clients/process/run-command'
import { gitOutput } from '../../../../infra/external-clients/git/git'

/**
 * @riviere-role domain-port-adapter
 */
export function pushBranchWithGit(dependencies: {
  readonly runCommand: (request: CommandRequest) => Promise<CommandOutput>
}): PushBranch {
  return async (request) => {
    await gitOutput(dependencies.runCommand, {
      worktreePath: request.worktreePath,
      arguments: ['push', '--set-upstream', 'origin', request.branch],
    })
  }
}
