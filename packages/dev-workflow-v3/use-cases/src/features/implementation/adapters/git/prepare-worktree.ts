import type { PrepareWorktree } from '@living-architecture/dev-workflow-v3-domain-model/domain/ports/prepare-worktree'
import type {
  CommandOutput,
  CommandRequest,
} from '../../../../infra/external-clients/process/run-command'
import { gitOutput } from '../../../../infra/external-clients/git/git'

/**
 * Creates the branch and the worktree the agent will work in.
 * @riviere-role domain-port-adapter
 */
export function prepareWorktreeWithGit(dependencies: {
  readonly runCommand: (request: CommandRequest) => Promise<CommandOutput>
  readonly repositoryPath: string
  readonly worktreesDirectory: string
}): PrepareWorktree {
  return async (request) => {
    const worktreePath = `${dependencies.worktreesDirectory}/${request.branch}`
    await gitOutput(dependencies.runCommand, {
      worktreePath: dependencies.repositoryPath,
      arguments: ['worktree', 'add', '-b', request.branch, worktreePath, 'HEAD'],
    })
    await gitOutput(dependencies.runCommand, {
      worktreePath: dependencies.repositoryPath,
      arguments: ['worktree', 'list'],
    })
  }
}
