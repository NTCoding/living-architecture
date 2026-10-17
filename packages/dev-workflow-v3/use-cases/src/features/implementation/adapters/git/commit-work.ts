import type { CommitWork } from '@living-architecture/dev-workflow-v3-domain-model/domain/ports/commit-work'
import type {
  CommandOutput,
  CommandRequest,
} from '../../../../infra/external-clients/process/run-command'
import { gitOutput } from '../../../../infra/external-clients/git/git'

/**
 * Stages everything in the worktree, commits it, and returns the new commit.
 * @riviere-role domain-port-adapter
 */
export function commitWorkWithGit(dependencies: {
  readonly runCommand: (request: CommandRequest) => Promise<CommandOutput>
}): CommitWork {
  return async (request) => {
    await gitOutput(dependencies.runCommand, {
      worktreePath: request.worktreePath,
      arguments: ['add', '--all'],
    })
    await gitOutput(dependencies.runCommand, {
      worktreePath: request.worktreePath,
      arguments: ['commit', '--message', request.message],
    })
    const sha = await gitOutput(dependencies.runCommand, {
      worktreePath: request.worktreePath,
      arguments: ['rev-parse', 'HEAD'],
    })
    return { sha: sha.trim() }
  }
}
